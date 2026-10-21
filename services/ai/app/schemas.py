from typing import Literal, Optional, List
from pydantic import BaseModel, Field

Mode = Literal["scam", "dark_pattern", "paperwork"]
Risk = Literal["low", "medium", "high"]
Verdict = Literal["likely_scam", "unclear", "looks_genuine", "issues_found", "no_issues"]
Severity = Literal["low", "medium", "high"]
TacticName = Literal["urgency", "authority", "fear", "secrecy", "payment_demand", "other"]
DraftKind = Literal["family_alert", "report", "complaint", "reply", "cancellation"]

class Tactic(BaseModel):
    name: TacticName = Field(..., description="Manipulation tactic used (urgency, authority, fear, secrecy, payment_demand, other)")
    evidence: str = Field(..., description="Exact quote or observed evidence from the suspicious input")
    severity: Severity = Field(..., description="Severity level of this tactic")

class Finding(BaseModel):
    type: str = Field(..., description="Specific deceptive UI or dark pattern type (e.g. drip_pricing, false_urgency, confirm_shaming)")
    category: str = Field(..., description="Official dark pattern category from taxonomy")
    timestampSec: Optional[float] = Field(None, description="Timestamp in seconds where pattern occurred in video/flow, or null")
    explanation: str = Field(..., description="Plain-language explanation of why this condition or interface is deceptive/unfair")
    severity: Severity = Field(..., description="Severity of the consumer harm")

class Clause(BaseModel):
    text: str = Field(..., description="The excerpt or summary of the legal clause in question")
    risk: Severity = Field(..., description="Risk level posed by this clause")
    reason: str = Field(..., description="Plain language explanation of why this clause is risky to the user")
    citation: Optional[str] = Field(None, description="Specific section, clause number, or legal reference if available")

class Deadline(BaseModel):
    label: str = Field(..., description="Description of the action due (e.g. rent response, cure notice)")
    date: str = Field(..., description="ISO 8601 formatted date (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ)")
    source: str = Field(..., description="Excerpt or clause specifying this deadline")

class Draft(BaseModel):
    kind: DraftKind = Field(..., description="Type of draft response: family_alert, report, complaint, reply, or cancellation")
    title: str = Field(..., description="Title of the message or document")
    body: str = Field(..., description="Complete ready-to-use template with placeholders like [YOUR NAME]")

class AnalyzeResponse(BaseModel):
    mode: Mode = Field(..., description="Operating mode: scam, dark_pattern, or paperwork")
    risk: Risk = Field(..., description="Calculated overall risk level: low, medium, or high")
    verdict: Verdict = Field(..., description="Clear verdict: likely_scam, unclear, looks_genuine, issues_found, or no_issues")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score between 0.0 and 1.0")
    summary: str = Field(..., description="2-4 sentence summary in the requested language at a simple reading level")
    tactics: List[Tactic] = Field(default_factory=list, description="List of psychological or coercive tactics detected")
    findings: List[Finding] = Field(default_factory=list, description="List of dark patterns or deceptive UX findings")
    clauses: List[Clause] = Field(default_factory=list, description="List of extracted risky clauses with citations")
    deadlines: List[Deadline] = Field(default_factory=list, description="List of time-sensitive deadlines extracted")
    safeSteps: List[str] = Field(default_factory=list, description="Concrete next actions for safe independent verification")
    drafts: List[Draft] = Field(default_factory=list, description="Pre-written drafts for user review")
    audioUrl: Optional[str] = Field(None, description="URL or endpoint path to synthesized spoken explanation, or null")
    escalate: bool = Field(..., description="Whether to alert family or display emergency human helplines")
    disclaimer: str = Field(
        default="This is information to help you decide, not legal or financial advice.",
        description="Mandatory consumer advisory disclaimer"
    )

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    models: dict
