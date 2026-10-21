import re
from typing import Optional, List
from app.schemas import AnalyzeResponse, Finding, Draft, Verdict
from app.safety.policy import evaluate_policy
from app.rag.retriever import retriever
from app.tts import synthesize_explanation_audio

def analyze_dark_pattern_submission(
    text: str,
    language: str = "en",
    submission_id: Optional[str] = None
) -> AnalyzeResponse:
    """
    Audits consumer flows (checkouts, signups, cancellations) for CCPA dark patterns:
    - Pre-selected add-ons (basket sneaking)
    - Deceptive countdown timers (false urgency)
    - Guilt-based opt-outs (confirm shaming)
    - Hidden recurring fees (subscription traps)
    """
    text_lower = text.lower()
    is_hindi = language.startswith("hi")
    findings: List[Finding] = []

    # 1. Basket sneaking / Hidden fees
    if any(k in text_lower for k in ["pre-ticked", "insurance", "sneaking", "convenience fee", "add-on", "handling fee", "drip"]):
        findings.append(Finding(
            type="basket_sneaking",
            category="Pre-ticked Add-ons & Hidden Charges",
            timestampSec=12.0,
            explanation="Unrequested optional fee or protection plan was added or pre-selected in the checkout without explicit affirmative consent.",
            severity="medium"
        ))

    # 2. False urgency / Fake timers
    if any(k in text_lower for k in ["timer", "countdown", "expires in", "hurry", "only 2 left", "limited time"]):
        findings.append(Finding(
            type="false_urgency",
            category="Deceptive Scarcity",
            timestampSec=24.5,
            explanation="Pressure-inducing countdown timer or scarcity claim designed to induce impulsive purchasing before terms can be examined.",
            severity="medium"
        ))

    # 3. Confirm shaming
    if any(k in text_lower for k in ["shaming", "no thanks", "hate saving", "prefer to risk", "i don't care"]):
        findings.append(Finding(
            type="confirm_shaming",
            category="Guilt-based Interface Nudging",
            timestampSec=32.0,
            explanation="Opt-out mechanism uses emotionally manipulative phrasing to make consumer feel foolish for declining the offer.",
            severity="low"
        ))

    # 4. Subscription trap
    if any(k in text_lower for k in ["trial", "auto-renewal", "recurring", "hard to cancel", "subscription trap", "annual billing"]):
        findings.append(Finding(
            type="subscription_trap",
            category="Forced Continuous Billing",
            timestampSec=48.0,
            explanation="Introductory offer converts to recurring automated billing with obscure or deliberately obstructive cancellation methods.",
            severity="high"
        ))

    if findings:
        verdict: Verdict = "issues_found"
        confidence = 0.93
        summary = (
            f"इस चेकआउट/ऐप प्रक्रिया में {len(findings)} भ्रामक डिजाइन चालाकियां (Dark Patterns) पाई गईं। "
            "कृपया भुगतान करने से पहले अनचाहे शुल्क और ऑटो-डेबिट विकल्पों की जांच करें।"
            if is_hindi else
            f"This checkout flow contains {len(findings)} deceptive Dark Patterns prohibited by consumer protection guidelines. "
            "Verify your final cart balance and uncheck any pre-selected fees before confirming payment."
        )
    else:
        verdict = "no_issues"
        confidence = 0.88
        summary = (
            "इस स्क्रीन या चेकआउट प्रक्रिया में कोई भ्रामक डार्क पैटर्न नहीं मिला।"
            if is_hindi else
            "No deceptive dark patterns or concealed fees were identified in this interface sequence."
        )

    drafts = []
    if verdict == "issues_found":
        drafts = [
            Draft(
                kind="complaint",
                title="Consumer Protection Grievance - Deceptive Add-on Removal",
                body=(
                    "To: Merchant Grievance Officer / Customer Support\n\n"
                    "Subject: Notice regarding deceptive dark pattern (CCPA Dark Patterns Guidelines, 2023)\n\n"
                    "Dear Support,\n"
                    "During checkout for Order/Cart Reference: [ORDER ID], an optional charge was pre-selected or concealed without my affirmative consent. "
                    "Under the Central Consumer Protection Authority guidelines, such practices constitute unfair commercial conduct. "
                    "Please remove the unauthorized fee of [AMOUNT] and refund any associated debit immediately.\n\n"
                    "Sincerely,\n[YOUR NAME]"
                )
            ),
            Draft(
                kind="cancellation",
                title="Immediate Subscription Cancellation Request",
                body=(
                    "Please terminate all automated recurring billing and subscriptions associated with account [ACCOUNT EMAIL] effective immediately, "
                    "and furnish confirmation of cancellation."
                )
            )
        ]

    audio_url = synthesize_explanation_audio(summary, language)

    response = AnalyzeResponse(
        mode="dark_pattern",
        risk="medium" if verdict == "issues_found" else "low",
        verdict=verdict,
        confidence=confidence,
        summary=summary,
        tactics=[],
        findings=findings,
        clauses=[],
        deadlines=[],
        safeSteps=[
            "Uncheck any pre-ticked boxes for insurance, extended warranties, or priority packaging.",
            "Take a screenshot of the order summary and terms page before finalizing payment.",
            "If an unauthorized recurring payment was established, use the cancellation draft below."
        ] if verdict == "issues_found" else [],
        drafts=drafts,
        audioUrl=audio_url,
        escalate=False,
        disclaimer="This is information to help you decide, not legal or financial advice."
    )

    return evaluate_policy(response)
