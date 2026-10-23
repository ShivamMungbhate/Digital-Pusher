import os
import json
import hashlib
import logging
from pathlib import Path
from typing import Optional, Tuple, Dict, Any
from google import genai
from app.schemas import AnalyzeResponse, Tactic, Finding, Clause, Deadline, Draft

logger = logging.getLogger("ai_resilience")

CACHE_DIR = Path(os.getenv("AI_CACHE_DIR", "./.cache"))
CACHE_DIR.mkdir(parents=True, exist_ok=True)
CACHE_FILE = CACHE_DIR / "analysis_cache.json"

# In-memory store
_memory_cache: Dict[str, Dict[str, Any]] = {}

def get_input_hash(masked_text: str, mode: str, language: str) -> str:
    """Computes a SHA-256 hash of normalized (masked_text, mode, language)."""
    normalized = f"{masked_text.strip().lower()}:{mode.lower()}:{language.lower()}"
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

def is_cache_enabled() -> bool:
    """Checks if caching is enabled via environment variable (default: True)."""
    return os.getenv("ENABLE_AI_CACHE", "true").lower() not in ("false", "0", "no", "off")

def is_demo_cache_only() -> bool:
    """Checks if DEMO_CACHE_ONLY mode is active."""
    return os.getenv("DEMO_CACHE_ONLY", "false").lower() in ("true", "1", "yes")

# Pre-seeded reference demo responses for offline resilience
DEMO_RESPONSES = {
    "scam": AnalyzeResponse(
        mode="scam",
        risk="high",
        verdict="likely_scam",
        confidence=0.98,
        summary="High Alert: This message exhibits high-confidence scam tactics. The sender is using fabricated authority, urgency, or fear to coerce an immediate financial transfer.",
        tactics=[
            Tactic(name="urgency", evidence="URGENT ... in 2 hours", severity="high"),
            Tactic(name="authority", evidence="This is DCP Crime Branch", severity="high"),
            Tactic(name="fear", evidence="parcel with drugs was seized ... arrest warrant", severity="high"),
            Tactic(name="payment_demand", evidence="Transfer Rs 50,000 security deposit immediately", severity="high")
        ],
        findings=[],
        clauses=[],
        deadlines=[
            Deadline(label="Arrest warrant deadline", date="2026-10-23T00:00:00Z", source="in 2 hours")
        ],
        safeSteps=[
            "Never wire money, buy gift cards, or share OTPs based on unsolicited phone calls or text messages.",
            "Verify all claims through publicly registered contact numbers, never using numbers provided in the message.",
            "Consult family members or reach the 1930 Cybercrime Helpline immediately."
        ],
        drafts=[
            Draft(kind="family_alert", title="Urgent Scam Alert", body="I received a suspicious message claiming to be from DCP Crime Branch. I verified it is a scam."),
            Draft(kind="report", title="Cybercrime Report", body="Reporting impersonation and extortion attempt.")
        ],
        audioUrl="/audio/demo_scam_explanation.mp3",
        escalate=True,
        disclaimer="This is information to help you decide, not legal or financial advice."
    ),
    "genuine_otp": AnalyzeResponse(
        mode="scam",
        risk="low",
        verdict="looks_genuine",
        confidence=0.96,
        summary="This message appears to be a legitimate transactional notification or authentication OTP. It contains no coercive threats, penalties, or unauthorized payment demands.",
        tactics=[],
        findings=[],
        clauses=[],
        deadlines=[],
        safeSteps=[
            "Never share OTPs or verification codes with anyone calling you on phone.",
            "Only enter verification codes on the official verified app or website you personally opened."
        ],
        drafts=[],
        audioUrl=None,
        escalate=False,
        disclaimer="This is information to help you decide, not legal or financial advice."
    ),
    "dark_pattern": AnalyzeResponse(
        mode="dark_pattern",
        risk="medium",
        verdict="issues_found",
        confidence=0.92,
        summary="Dark patterns detected: Hidden recurring subscription billing and intentional obstacles to prevent cancellation.",
        tactics=[],
        findings=[
            Finding(type="subscription_trap", category="Roach Motel", timestampSec=15.0, explanation="Trial converts to $89.99/month recurring without clear upfront disclosure.", severity="high"),
            Finding(type="hard_to_cancel", category="Obstruction", timestampSec=30.0, explanation="Requires certified mail and cancellation fee to terminate trial.", severity="high")
        ],
        clauses=[],
        deadlines=[],
        safeSteps=[
            "Do not enter credit card details on this checkout.",
            "Contact your card issuer to block unauthorized merchant debits if already enrolled."
        ],
        drafts=[
            Draft(kind="cancellation", title="Immediate Cancellation Notice", body="I hereby cancel my trial subscription and revoke recurring billing authorization.")
        ],
        audioUrl="/audio/demo_dark_pattern.mp3",
        escalate=False,
        disclaimer="This is information to help you decide, not legal or financial advice."
    ),
    "paperwork": AnalyzeResponse(
        mode="paperwork",
        risk="high",
        verdict="issues_found",
        confidence=0.95,
        summary="High-risk predatory terms identified. The agreement permits unilateral eviction with only 24 hours notice and forces the tenant to pay all legal fees regardless of outcome.",
        tactics=[],
        findings=[],
        clauses=[
            Clause(text="Landlord reserves unilateral right to terminate with 24 hours notice", risk="high", reason="Standard tenancy law requires minimum 30 days written notice", citation="Section 14(b)"),
            Clause(text="Tenant waives court rights and bears all legal fees", risk="high", reason="One-sided fee shifting penalizes tenant even when landlord breaches", citation="Section 14(b)")
        ],
        deadlines=[
            Deadline(label="Lease notice review", date="2026-11-01T00:00:00Z", source="Section 14(b)")
        ],
        safeSteps=[
            "Do not sign this agreement in its current form.",
            "Request amending Section 14(b) using the draft reply below."
        ],
        drafts=[
            Draft(kind="reply", title="Requested Lease Amendment", body="Regarding Section 14(b), I request standard 30-day notice and mutual legal fees before signing.")
        ],
        audioUrl="/audio/demo_paperwork.mp3",
        escalate=True,
        disclaimer="This is information to help you decide, not legal or financial advice."
    )
}

def load_disk_cache():
    """Loads cached results from disk into memory."""
    global _memory_cache
    if CACHE_FILE.exists():
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                _memory_cache = json.load(f)
        except Exception as e:
            logger.warning(f"Could not load cache file from disk: {e}")

def save_disk_cache():
    """Persists memory cache to disk."""
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(_memory_cache, f, indent=2)
    except Exception as e:
        logger.warning(f"Could not persist cache to disk: {e}")

# Initialize cache on module load
load_disk_cache()

def get_cached_analysis(key: str) -> Optional[AnalyzeResponse]:
    """Retrieves cached response by hash if caching is enabled."""
    if not is_cache_enabled():
        return None

    if key in _memory_cache:
        try:
            data = _memory_cache[key]
            logger.info("Cache hit for analysis hash")
            return AnalyzeResponse(**data)
        except Exception:
            return None
    return None

def set_cached_analysis(key: str, response: AnalyzeResponse) -> None:
    """Stores response in cache by hash."""
    if not is_cache_enabled():
        return

    try:
        _memory_cache[key] = response.model_dump()
        save_disk_cache()
    except Exception as e:
        logger.warning(f"Failed to write to analysis cache: {e}")

def find_demo_cache_match(masked_text: str, mode: str) -> Optional[AnalyzeResponse]:
    """Matches text against known demo scenarios for DEMO_CACHE_ONLY mode."""
    lower = masked_text.lower()
    if "482910" in lower or ("otp" in lower and "hdfc" in lower) or ("do not share" in lower and "valid for 10" in lower):
        return DEMO_RESPONSES["genuine_otp"]
    if "dcp" in lower or "crime branch" in lower or "drug parcel" in lower or "mumbai airport" in lower:
        return DEMO_RESPONSES["scam"]
    if "trial" in lower and ("89.99" in lower or "auto-renew" in lower or "certified mail" in lower):
        return DEMO_RESPONSES["dark_pattern"]
    if "section 14" in lower or ("24 hours notice" in lower and "terminate" in lower) or ("landlord" in lower and "tenant" in lower):
        return DEMO_RESPONSES["paperwork"]
    return None

def build_safe_fallback(mode: str = "scam", language: str = "en") -> AnalyzeResponse:
    """
    Constructs the standard safe fallback response:
    verdict: 'unclear', escalate: True, confidence: 0.5.
    """
    is_hindi = language.startswith("hi")
    return AnalyzeResponse(
        mode="scam" if mode == "auto" else mode,
        risk="medium",
        verdict="unclear",
        confidence=0.5,
        summary=(
            "विश्लेषण के दौरान सर्वर त्रुटि आई। सुरक्षा कारणों से कृपया सतर्क रहें और किसी भी धनराशि का हस्तांतरण न करें।"
            if is_hindi else
            "We could not reach a high-confidence verdict due to a verification timeout. Please exercise caution, do not send funds or share credentials, and verify independently."
        ),
        tactics=[],
        findings=[],
        clauses=[],
        deadlines=[],
        safeSteps=[
            "Do not share OTPs, transfer funds, or sign agreements while independent verification is pending.",
            "Contact your family member or call the Cybercrime Helpline at 1930 directly."
        ],
        drafts=[],
        audioUrl=None,
        escalate=True,
        disclaimer="This is information to help you decide, not legal or financial advice."
    )

def call_gemini_resilient(
    prompt: str,
    language: str = "en",
    submission_id: Optional[str] = None
) -> Tuple[Optional[AnalyzeResponse], str]:
    """
    Resilient Gemini execution pipeline:
    1. Check DEMO_CACHE_ONLY
    2. Try Strong Model (with 1 retry on invalid JSON)
    3. On rate limit or error, fall back to Fast Model (with 1 retry on invalid JSON)
    4. On total model failure, return (None, 'safe_fallback')
    Logs the exact execution path without logging raw user text or unmasked PII.
    """
    # 1. DEMO_CACHE_ONLY check
    if is_demo_cache_only():
        demo_match = find_demo_cache_match(prompt, "auto")
        if demo_match:
            logger.info("Analysis served via DEMO_CACHE_ONLY path. Path: demo_cache")
            return demo_match, "demo_cache"

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or os.getenv("SKIP_LIVE_GEMINI"):
        logger.info("No Gemini API key or SKIP_LIVE_GEMINI configured. Path: local_grounded")
        return None, "local_grounded"

    strong_model = os.getenv("GEMINI_STRONG_MODEL", "gemini-2.5-flash")
    fast_model = os.getenv("GEMINI_FAST_MODEL", "gemini-2.5-flash")

    client = genai.Client(api_key=api_key)

    # Helper for a single model call with 1 JSON retry
    def invoke_model(model_name: str) -> Optional[AnalyzeResponse]:
        for attempt in range(1, 3):
            try:
                res = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config={
                        'response_mime_type': 'application/json',
                        'response_schema': AnalyzeResponse
                    }
                )
                if res.parsed and isinstance(res.parsed, AnalyzeResponse):
                    return res.parsed
                # If parsed is missing or invalid structure, retry once
                logger.warning(f"Invalid JSON/schema from model on attempt {attempt}. Retrying once...")
            except Exception as e:
                err_str = str(e).lower()
                # Rate limit (429) or quota exhaustion -> immediately raise to trigger model fallback
                if "429" in err_str or "quota" in err_str or "rate limit" in err_str:
                    logger.warning(f"Rate limit / quota exceeded on model ({type(e).__name__}).")
                    raise e
                # Network or parsing failure -> allow retry on attempt 1, raise on attempt 2
                if attempt == 1:
                    logger.warning(f"Model call attempt 1 failed ({type(e).__name__}). Retrying once...")
                else:
                    raise e
        return None

    # Step 1: Attempt Strong Model
    try:
        logger.info(f"Attempting analysis via strong model. Path: strong_model")
        result = invoke_model(strong_model)
        if result:
            logger.info("Analysis completed successfully via strong model. Path: strong_model")
            return result, "strong_model"
    except Exception as e:
        logger.warning(f"Strong model failed ({type(e).__name__}). Falling back to fast model. Path: strong -> fast")

    # Step 2: Fallback to Fast Model
    try:
        logger.info(f"Attempting analysis via fast model fallback. Path: fast_model")
        result = invoke_model(fast_model)
        if result:
            logger.info("Analysis completed successfully via fast model. Path: fast_model")
            return result, "fast_model"
    except Exception as e:
        logger.warning(f"Fast model also failed ({type(e).__name__}). Falling back to safe fallback response. Path: safe_fallback")

    # Step 3: Total Model Failure -> Return None to trigger safe fallback
    logger.info("All model paths exhausted. Path: safe_fallback")
    return None, "safe_fallback"
