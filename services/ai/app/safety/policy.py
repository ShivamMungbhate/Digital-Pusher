from datetime import datetime, timezone
from typing import List, Tuple
from app.schemas import AnalyzeResponse, Tactic, Finding, Clause, Deadline, Risk, Verdict

MANDATORY_DISCLAIMER = "This is information to help you decide, not legal or financial advice."

SAFE_SCAM_STEPS = [
    "Never transfer money, share OTPs, or click links sent in unexpected messages.",
    "Do not call the phone number provided in the message or email. Instead, look up the official contact on your bank's physical card or official website.",
    "Government bodies and legitimate police agencies never demand money via UPI or threat of immediate arrest over video calls.",
    "If in doubt, talk to a trusted family member or call the National Cybercrime Helpline at 1930."
]

def filter_unsupported_evidence(
    tactics: List[Tactic],
    findings: List[Finding],
    clauses: List[Clause]
) -> Tuple[List[Tactic], List[Finding], List[Clause]]:
    """Enforces honesty rule: drop any tactic, finding, or clause that lacks concrete evidence/quote."""
    clean_tactics = [t for t in tactics if t.evidence and len(t.evidence.strip()) >= 3]
    clean_findings = [f for f in findings if f.explanation and len(f.explanation.strip()) >= 5]
    clean_clauses = [c for c in clauses if c.text and len(c.text.strip()) >= 5]
    return clean_tactics, clean_findings, clean_clauses

def evaluate_policy(response: AnalyzeResponse) -> AnalyzeResponse:
    """
    Deterministically computes final risk, escalation rules, evidence enforcement,
    and attaches standard safety advisories.
    """
    # 1. Evidence filtering
    clean_tactics, clean_findings, clean_clauses = filter_unsupported_evidence(
        response.tactics, response.findings, response.clauses
    )
    response.tactics = clean_tactics
    response.findings = clean_findings
    response.clauses = clean_clauses

    # 2. Risk Calculation based on severity and confidence
    has_high_tactic = any(t.severity == "high" for t in response.tactics)
    has_high_finding = any(f.severity == "high" for f in response.findings)
    has_high_clause = any(c.risk == "high" for c in response.clauses)
    has_medium = (
        any(t.severity == "medium" for t in response.tactics) or
        any(f.severity == "medium" for f in response.findings) or
        any(c.risk == "medium" for c in response.clauses)
    )

    calculated_risk: Risk = "low"
    if has_high_tactic or has_high_finding or has_high_clause:
        calculated_risk = "high"
    elif has_medium or response.verdict in ("likely_scam", "issues_found"):
        calculated_risk = "medium"

    response.risk = calculated_risk

    # 3. Escalation Rules
    escalate = response.escalate

    # Check for payment demands / extortion
    if any(t.name == "payment_demand" for t in response.tactics):
        escalate = True

    # Check for urgent legal deadlines (< 7 days)
    now = datetime.now(timezone.utc)
    for deadline in response.deadlines:
        try:
            dl_date = datetime.fromisoformat(deadline.date.replace("Z", "+00:00"))
            days_left = (dl_date - now).total_seconds() / 86400
            if days_left <= 7:
                escalate = True
                break
        except Exception:
            # If date format is malformed or relative, escalate if high risk
            if response.risk == "high":
                escalate = True

    # Check for low confidence on high severity finding (uncertain threat)
    if response.confidence < 0.65 and (has_high_tactic or has_high_clause):
        escalate = True
        response.verdict = "unclear"

    if response.verdict == "likely_scam" and response.risk == "high":
        escalate = True

    response.escalate = escalate

    # 4. Mandatory Disclaimers and Safe Steps
    response.disclaimer = MANDATORY_DISCLAIMER

    if response.mode == "scam" and not response.safeSteps:
        response.safeSteps = SAFE_SCAM_STEPS

    return response
