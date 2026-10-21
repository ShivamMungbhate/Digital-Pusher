from datetime import datetime, timezone, timedelta
from app.schemas import AnalyzeResponse, Tactic, Finding, Clause, Deadline
from app.safety.policy import evaluate_policy

def test_escalation_on_payment_demand():
    resp = AnalyzeResponse(
        mode="scam",
        risk="low",
        verdict="likely_scam",
        confidence=0.9,
        summary="Test summary",
        tactics=[
            Tactic(name="payment_demand", evidence="Demand of Rs 50,000", severity="high")
        ],
        findings=[],
        clauses=[],
        deadlines=[],
        safeSteps=[],
        drafts=[],
        audioUrl=None,
        escalate=False,
        disclaimer=""
    )
    evaluated = evaluate_policy(resp)
    assert evaluated.risk == "high"
    assert evaluated.escalate is True
    assert evaluated.disclaimer != ""
    assert len(evaluated.safeSteps) > 0

def test_escalation_on_short_deadline():
    due_in_3_days = (datetime.now(timezone.utc) + timedelta(days=3)).strftime("%Y-%m-%dT18:00:00Z")
    resp = AnalyzeResponse(
        mode="paperwork",
        risk="low",
        verdict="issues_found",
        confidence=0.9,
        summary="Test summary",
        tactics=[],
        findings=[],
        clauses=[
            Clause(text="Vacate within 3 days or face eviction", risk="high", reason="Too short", citation="Cl 1")
        ],
        deadlines=[
            Deadline(label="Vacate deadline", date=due_in_3_days, source="Notice")
        ],
        safeSteps=[],
        drafts=[],
        audioUrl=None,
        escalate=False,
        disclaimer=""
    )
    evaluated = evaluate_policy(resp)
    assert evaluated.escalate is True

def test_filter_unsupported_evidence():
    resp = AnalyzeResponse(
        mode="scam",
        risk="low",
        verdict="unclear",
        confidence=0.5,
        summary="Test summary",
        tactics=[
            Tactic(name="authority", evidence="", severity="low")  # Empty evidence must be dropped
        ],
        findings=[],
        clauses=[],
        deadlines=[],
        safeSteps=[],
        drafts=[],
        audioUrl=None,
        escalate=False,
        disclaimer=""
    )
    evaluated = evaluate_policy(resp)
    assert len(evaluated.tactics) == 0
