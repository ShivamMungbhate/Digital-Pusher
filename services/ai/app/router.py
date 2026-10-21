import os
import re
from typing import Tuple
from app.schemas import Mode

FAST_MODEL = os.getenv("GEMINI_FAST_MODEL", "gemini-2.0-flash")

SCAM_KEYWORDS = [
    "arrest", "police", "cbi", "customs", "aadhaar", "lottery", "otp", "kbc",
    "kyc", "electricity", "disconnection", "bill", "transfer", "urgent", "secrecy",
    "bank", "account blocked", "prize", "refund", "suspect"
]

DARK_PATTERN_KEYWORDS = [
    "checkout", "cart", "pre-ticked", "subscription", "recurring", "annual",
    "timer", "countdown", "cancel", "hidden fee", "convenience fee", "drip",
    "shaming", "forced action", "free trial"
]

PAPERWORK_KEYWORDS = [
    "lease", "tenant", "landlord", "eviction", "rent", "agreement", "notice",
    "clause", "vacate", "security deposit", "legal", "court", "advocate",
    "statutory", "contract"
]

def classify_mode(text: str, filename: str = "", content_type: str = "") -> Tuple[Mode, float]:
    """
    Classifies untrusted submission content into (mode, confidence).
    If confidence is low (< 0.5), defaults safely to 'scam' with low confidence
    so the policy layer can flag as 'unclear'.
    """
    text_lower = text.lower()
    filename_lower = filename.lower()
    content_type_lower = content_type.lower()

    if filename_lower.endswith(".pdf") or "pdf" in content_type_lower:
        return "paperwork", 0.95

    if "video" in content_type_lower:
        return "dark_pattern", 0.90

    scam_score = sum(1 for kw in SCAM_KEYWORDS if kw in text_lower)
    dp_score = sum(1 for kw in DARK_PATTERN_KEYWORDS if kw in text_lower)
    pw_score = sum(1 for kw in PAPERWORK_KEYWORDS if kw in text_lower)

    max_score = max(scam_score, dp_score, pw_score)
    total_score = scam_score + dp_score + pw_score

    if total_score == 0:
        return "scam", 0.45  # Low confidence triggers unclear verdict safely

    confidence = min(0.95, 0.6 + (max_score / max(1, total_score)) * 0.35)

    if scam_score >= dp_score and scam_score >= pw_score:
        return "scam", confidence
    elif dp_score >= pw_score:
        return "dark_pattern", confidence
    else:
        return "paperwork", confidence
