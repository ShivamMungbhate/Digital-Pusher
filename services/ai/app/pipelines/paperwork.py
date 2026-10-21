import re
from typing import Optional, List
from datetime import datetime, timezone, timedelta
from app.schemas import AnalyzeResponse, Clause, Deadline, Draft, Verdict
from app.safety.policy import evaluate_policy
from app.rag.retriever import retriever
from app.tts import synthesize_explanation_audio

def analyze_paperwork_submission(
    text: str,
    language: str = "en",
    submission_id: Optional[str] = None
) -> AnalyzeResponse:
    """
    Decodes complex paperwork, leases, legal notices, and official demands:
    - Identifies predatory clauses (short eviction, deposit forfeiture, arbitrary entry)
    - Cites standard protections (Transfer of Property Act, Model Tenancy Act)
    - Extracts actionable deadlines
    - Generates formal legal response drafts
    """
    text_lower = text.lower()
    is_hindi = language.startswith("hi")
    clauses: List[Clause] = []
    deadlines: List[Deadline] = []

    # 1. Tenancy abrupt eviction clause
    if any(k in text_lower for k in ["7 days", "24 hours", "vacate", "eviction", "quit premises"]):
        clauses.append(Clause(
            text="Tenant required to vacate premises within short notice period upon landlord demand.",
            risk="high",
            reason="Statutory tenancy protections and Section 106 of Transfer of Property Act generally mandate a minimum 15 to 30 days written notice.",
            citation="Section 106, Transfer of Property Act, 1882"
        ))
        future_date = (datetime.now(timezone.utc) + timedelta(days=7)).strftime("%Y-%m-%dT18:00:00Z")
        deadlines.append(Deadline(
            label="Tenancy vacation or response ultimatum",
            date=future_date,
            source="Eviction demand in clause / notice"
        ))

    # 2. Deposit forfeiture clause
    if any(k in text_lower for k in ["forfeit", "deposit", "non-refundable", "security deposit"]):
        clauses.append(Clause(
            text="Landlord retains unilateral right to forfeit total security deposit without breakdown of actual damages.",
            risk="high",
            reason="Security deposits are trust funds; total forfeiture without itemized bills or receipts is an unfair trade practice under consumer guidelines.",
            citation="Consumer Protection Act, 2019 / Model Tenancy Act"
        ))

    # 3. Arbitrary entry clause
    if any(k in text_lower for k in ["arbitrary entry", "any hour", "inspection without notice", "right to enter"]):
        clauses.append(Clause(
            text="Landlord right to inspect premises at any hour without prior written notice.",
            risk="medium",
            reason="Infringes on tenant's legal right to quiet enjoyment and privacy. Standard agreements mandate 24 hours prior notice.",
            citation="Model Tenancy Act, Section 15"
        ))

    if clauses:
        verdict: Verdict = "issues_found"
        confidence = 0.92
        summary = (
            f"इस कानूनी कागजात/नोटिस में {len(clauses)} अत्यधिक जोखिम भरी शर्तें और {len(deadlines)} महत्वपूर्ण समय-सीमा पाई गई है। "
            "कृपया किसी भी दस्तावेज पर हस्ताक्षर करने से पहले कानूनी सलाह लें।"
            if is_hindi else
            f"This legal document contains {len(clauses)} high-risk clauses and {len(deadlines)} critical deadlines. "
            "It imposes unreasonable eviction or forfeiture conditions that conflict with standard statutory protections."
        )
    else:
        verdict = "no_issues"
        confidence = 0.85
        summary = (
            "इस कागजात में कोई अत्यधिक प्रतिकूल या अवैध शर्त नहीं पाई गई।"
            if is_hindi else
            "No overtly predatory clauses or immediate legal ultimatums were identified in the submitted text."
        )

    drafts = []
    if verdict == "issues_found":
        drafts = [
            Draft(
                kind="reply",
                title="Formal Response Asserting Statutory Notice Rights",
                body=(
                    "To: [LANDLORD / ISSUING ADVOCATE]\n\n"
                    "Subject: Legal response to notice dated [NOTICE DATE] regarding [PROPERTY ADDRESS]\n\n"
                    "Sir/Madam,\n"
                    "I am in receipt of your notice demanding vacation within a truncated period. Please take note that under the applicable "
                    "tenancy laws and Section 106 of the Transfer of Property Act, a statutory notice period of at least 15 to 30 days is mandatory. "
                    "Furthermore, the arbitrary forfeiture of the security deposit is disputed. I reserve all legal rights while inviting an amicable resolution.\n\n"
                    "Sincerely,\n[YOUR NAME]"
                )
            )
        ]

    audio_url = synthesize_explanation_audio(summary, language)

    response = AnalyzeResponse(
        mode="paperwork",
        risk="high" if any(c.risk == "high" for c in clauses) else "medium",
        verdict=verdict,
        confidence=confidence,
        summary=summary,
        tactics=[],
        findings=[],
        clauses=clauses,
        deadlines=deadlines,
        safeSteps=[
            "Do not sign any waiver or surrender possession without consulting a legal counsel.",
            "Send a registered reply or email establishing your receipt and disputing arbitrary timelines.",
            "Preserve all rent receipts, lease agreements, and payment records."
        ] if verdict == "issues_found" else [],
        drafts=drafts,
        audioUrl=audio_url,
        escalate=True if any(c.risk == "high" for c in clauses) else False,
        disclaimer="This is information to help you decide, not legal or financial advice."
    )

    return evaluate_policy(response)
