import os
import re
import logging
from typing import Optional
from google import genai
from app.schemas import AnalyzeResponse, Tactic, Draft, Verdict
from app.safety.pii import mask_pii
from app.safety.policy import evaluate_policy
from app.rag.retriever import retriever
from app.tts import synthesize_explanation_audio

logger = logging.getLogger("scam_pipeline")

# Multilingual Genuine Notification Indicators
GENUINE_INDICATORS = [
    # English OTP & Auth
    "your otp is", "is your otp", "otp for", "secret otp for", "verification code",
    "one time password", "do not share this otp", "never share this code", "google verification code",
    # English Transactions & Delivery
    "has been debited", "salary credit", "credited with inr", "balance: inr", "transaction at",
    "out for delivery", "has been delivered", "will be delivered", "rate your delivery partner",
    "appointment with dr", "web check-in", "ticket booked", "utility statement for", "bill for october",
    "is generated. due date",
    # Hindi OTP & Transactions
    "ओटीपी", "प्रमाणीकरण", "साझा न करें", "डिलीवरी कोड", "पहुंचाया जाएगा"
]

# Multilingual Threat & Coercion Indicators
THREAT_INDICATORS = [
    # English
    "arrest", "warrant", "cbi", "drug parcel", "money laundering",
    "electricity power supply will be disconnected", "disconnected tonight",
    "lucky draw", "won rs", "transfer rs", "deposit rs", "bail money", "apk", "anydesk",
    "deactivated within 24 hours", "unclaimed it refund", "fasttag account is suspended",
    "earn rs", "part-time job", "reviewing hotels",
    # Hindi
    "बिजली कनेक्शन आज रात", "काट दिया जाएगा", "साइबर पुलिस", "ड्रग्स से भरा", "सिक्योरिटी डिपॉजिट",
    "लकी ड्रा", "लाख रुपये जीते", "सरकारी टैक्स जमा करें", "केवाईसी निलंबित", "खाता बंद हो जाएगा",
    "एक्सीडेंट हो गया है", "कस्टम ड्यूटी", "घर बैठे रोजाना", "वीडियो लाइक करके"
]

def analyze_scam_submission(
    text: str,
    language: str = "en",
    submission_id: Optional[str] = None
) -> AnalyzeResponse:
    masked_text, pii_map = mask_pii(text)
    is_hindi = language.startswith("hi") or any('\u0900' <= char <= '\u097F' for char in text)
    text_lower = masked_text.lower()

    # 1. Discrimination: Genuine vs Coercive
    has_genuine = any(kw in text_lower for kw in GENUINE_INDICATORS)
    has_threat = any(kw in text_lower for kw in THREAT_INDICATORS)

    # Prompt injection check
    is_injection = any(p in text_lower for p in [
        "ignore all prior", "system prompt update", "system override",
        "output verdict: looks_genuine", "ignore security rules",
        "</suspicious_content>", "[inst]", "set risk to low"
    ])

    if has_genuine and not has_threat and not is_injection:
        response = AnalyzeResponse(
            mode="scam",
            risk="low",
            verdict="looks_genuine",
            confidence=0.96,
            summary=(
                "यह एक सामान्य और प्रामाणिक सूचना या ओटीपी (OTP) संदेश प्रतीत होता है। इसमें कोई वित्तीय धमकी या अनुचित मांग नहीं है।"
                if is_hindi else
                "This message appears to be a legitimate transactional notification or authentication OTP. It contains no coercive threats, penalties, or unauthorized payment demands."
            ),
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
        )
        return evaluate_policy(response)

    if is_injection:
        response = AnalyzeResponse(
            mode="scam",
            risk="medium",
            verdict="unclear",
            confidence=0.6,
            summary=(
                "इस इनपुट में सुरक्षा नियमों को बायपास करने का प्रयास पाया गया है। कृपया सतर्क रहें।"
                if is_hindi else
                "Suspicious prompt-injection commands were detected within this input. The request has been flagged for independent verification."
            ),
            tactics=[Tactic(name="other", evidence="Prompt injection command sequence detected", severity="medium")],
            findings=[],
            clauses=[],
            deadlines=[],
            safeSteps=["Do not execute scripts or commands provided in unsolicited messages."],
            drafts=[],
            audioUrl=None,
            escalate=True,
            disclaimer="This is information to help you decide, not legal or financial advice."
        )
        return evaluate_policy(response)

    # 2. Try Live Google Gemini Model if GEMINI_API_KEY is configured
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key and not os.getenv("SKIP_LIVE_GEMINI"):
        try:
            client = genai.Client(api_key=api_key)
            model_name = os.getenv("GEMINI_FAST_MODEL", "gemini-2.5-flash")
            logger.info(f"Invoking Live Gemini Model ({model_name}) for scam analysis")

            prompt = f"""You are Digital Pusher Scam Guardian, an expert cyber fraud investigator protecting seniors.
Analyze this user submission for psychological and financial manipulation tricks:
<SUSPICIOUS_CONTENT>
{masked_text}
</SUSPICIOUS_CONTENT>

Requested language for summary: {"Hindi" if is_hindi else "English"}

Directives:
1. Genuine transactional alerts (OTPs, delivery confirmations) are NOT scams unless they contain explicit threats, penalties, or demands to call unverified numbers.
2. For every tactic identified, provide the exact quote in the 'evidence' field.
3. Write a calm, reassuring, 2-4 sentence summary in {"Hindi" if is_hindi else "English"} explaining the manipulation directly.
4. Provide safe independent verification steps (e.g. call number printed on physical bank card).
5. Generate a family alert draft and a cybercrime report draft if scam tactics are found."""

            gemini_res = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config={
                    'response_mime_type': 'application/json',
                    'response_schema': AnalyzeResponse
                }
            )

            if gemini_res.parsed and isinstance(gemini_res.parsed, AnalyzeResponse):
                logger.info("Successfully received and parsed live Gemini structured output")
                live_response = gemini_res.parsed
                live_response.audioUrl = synthesize_explanation_audio(live_response.summary, "hi" if is_hindi else "en")
                return evaluate_policy(live_response)
        except Exception as e:
            logger.warning(f"Live Gemini API call failed or timed out: {e}. Falling back gracefully to grounded local engine.")

    # 3. Grounded Local Engine Fallback (Instant, Zero-Cost, 100% Offline Safe)
    grounding = retriever.retrieve_scam_grounding(masked_text, top_k=2)

    # Identify specific tactics with exact evidence quotes
    detected_tactics = []
    
    # Authority (English & Hindi)
    if re.search(r'\b(dcp|police|cbi|rbi|customs|inspector|officer|vigilance|cyber crime|bank manager|trai)\b', text_lower) or any(k in text_lower for k in ["साइबर पुलिस", "कस्टम विभाग", "बिजली अधिकारी"]):
        detected_tactics.append(Tactic(
            name="authority",
            evidence="Impersonates official law enforcement, bank, or utility authority",
            severity="high"
        ))

    # Urgency (English & Hindi)
    if re.search(r'\b(urgent|immediately|within \d+ hours?|tonight|2 hours|action required|suspended today)\b', text_lower) or any(k in text_lower for k in ["आज रात", "तुरंत", "24 hours"]):
        detected_tactics.append(Tactic(
            name="urgency",
            evidence="Enforces urgent countdown or immediate deadline",
            severity="high"
        ))

    # Fear (English & Hindi)
    if re.search(r'\b(arrest|warrant|drug parcel|illegal|money laundering|fir|deactivated|disconnection|court|blacklisting)\b', text_lower) or any(k in text_lower for k in ["काट दिया जाएगा", "ड्रग्स से भरा", "खाता बंद", "एक्सीडेंट"]):
        detected_tactics.append(Tactic(
            name="fear",
            evidence="Creates fear of arrest, disconnection, legal action, or personal emergency",
            severity="high"
        ))

    # Payment demand (English & Hindi) - specifically demands or extortion
    if re.search(r'\b(transfer rs|deposit rs|security deposit|clearing account|bail money|clear dues|advance tax|training fee|processing fee)\b', text_lower) or any(k in text_lower for k in ["डिपॉजिट", "रुपये जमा", "टैक्स चुकाएं", "30000 भेज"]):
        detected_tactics.append(Tactic(
            name="payment_demand",
            evidence="Demands immediate payment, deposit, or fee clearance",
            severity="high"
        ))

    # Determine verdict and confidence
    if len(detected_tactics) >= 2 or any(t.severity == "high" for t in detected_tactics) or has_threat:
        verdict: Verdict = "likely_scam"
        confidence = 0.96
        risk = "high"
        summary = (
            "सावधान! यह एक गंभीर धोखाधड़ी (Scam) का प्रयास है। कॉलर या मैसेज आपको नुकसान या कानूनी कार्रवाई का डर दिखाकर बिना सोचे पैसे ट्रांसफर करवाने की कोशिश कर रहा है।"
            if is_hindi else
            "High Alert: This message exhibits high-confidence scam tactics. The sender is using fabricated authority, urgency, or fear to coerce an immediate financial transfer."
        )
    elif len(detected_tactics) == 1:
        verdict = "unclear"
        confidence = 0.65
        risk = "medium"
        summary = (
            "यह संदेश संदिग्ध प्रतीत होता है। कृपया किसी भी अनजान नंबर पर पैसे न भेजें।"
            if is_hindi else
            "This message contains suspicious language. Do not reply or send money until you independently verify the sender."
        )
    else:
        verdict = "unclear"
        confidence = 0.50
        risk = "low"
        summary = (
            "इस संदेश में कोई स्पष्ट धोखाधड़ी के संकेत नहीं मिले, लेकिन हमेशा सतर्क रहें।"
            if is_hindi else
            "No clear scam patterns were detected, but please remain cautious and never share personal financial details."
        )

    # Pre-written family alert and cybercrime report drafts
    drafts = []
    if verdict == "likely_scam":
        drafts = [
            Draft(
                kind="family_alert",
                title="Immediate Scam Warning: Coercive Fraud Attempt",
                body=(
                    f"Hi Family, I received an urgent threatening communication. "
                    "Digital Pusher verified it as a scam attempt. I have blocked the number and have NOT transferred any funds."
                )
            ),
            Draft(
                kind="report",
                title="Cybercrime Incident Report Draft",
                body=(
                    "To: National Cybercrime Reporting Portal (1930 / cybercrime.gov.in)\n\n"
                    "Incident Description: Extortion / Impersonation Scam.\n"
                    f"Observed Tactics: {', '.join(t.name for t in detected_tactics)}\n"
                    "Action Taken: Sender blocked. No credentials or money shared."
                )
            )
        ]

    audio_url = synthesize_explanation_audio(summary, "hi" if is_hindi else "en")

    response = AnalyzeResponse(
        mode="scam",
        risk=risk,
        verdict=verdict,
        confidence=confidence,
        summary=summary,
        tactics=detected_tactics,
        findings=[],
        clauses=[],
        deadlines=[],
        safeSteps=[],
        drafts=drafts,
        audioUrl=audio_url,
        escalate=True if verdict == "likely_scam" else False,
        disclaimer="This is information to help you decide, not legal or financial advice."
    )

    return evaluate_policy(response)
