# Digital Pusher - Gemini AI Analysis Service 🧠
> Multimodal AI analysis service built for Google Gemini Hackathon, powering Scam Guardian, Dark Pattern Auditor, and Paperwork Decoder.

## Architecture & Pipeline Flow
```
Untrusted Input (Text / Audio / Video / PDF)
       │
       ▼
1. Intake & Media Preprocessing (ffmpeg, pypdf, frame sampling)
       │
       ▼
2. PII Masking ([PHONE_1], [AADHAAR_1], [CARD_1], [EMAIL_1])
       │
       ▼
3. Mode Router (Fast Model / Heuristic -> scam | dark_pattern | paperwork)
       │
       ▼
4. Knowledge Grounding (RAG against CCPA Taxonomy, Scam Scripts, Tenancy Acts)
       │
       ▼
5. Structured Analysis (Gemini Fast Model / google-genai Pydantic output schema)
       │
       ▼
6. Policy Layer (Risk calculation, 7-day deadline escalation, zero-false-positive rule)
       │
       ▼
7. Multilingual Drafter & TTS (Hindi/English summary, speech synthesis -> /audio/{id}.mp3)
       │
       ▼
Contract Response (Validated against Pydantic AnalyzeResponse)
```

---

## Model Selection (Configurable via Environment Variables)
- **`GEMINI_FAST_MODEL`** (Default: `gemini-2.0-flash`): Triage routing, rapid extraction, structured JSON output.
- **`GEMINI_STRONG_MODEL`** (Default: `gemini-2.5-flash`): Drafting legal complaint letters, family alerts, and complex edge-case analysis.
- **`GEMINI_EMBED_MODEL`** (Default: `text-embedding-004`): Grounding knowledge base retrieval.
- **`GEMINI_TTS_MODEL`** (Default: `gemini-2.0-flash` / `gTTS`): Speech synthesis for senior-friendly audio explanations.

---

## Safety & Honesty Rules (Enforced in Code & Prompts)
1. **No Deepfake Voice Claims**: We flag behavioral patterns (artificial panic, secrecy, money requests), never claiming to reliably identify acoustic voice cloning.
2. **Zero False-Positive Protection on Genuine Notifications**: Standard bank OTPs, delivery confirmations, and appointment reminders are never marked as scams merely because they contain links or numbers.
3. **Prompt Injection Defense**: Untrusted content is isolated inside `<SUSPICIOUS_CONTENT>` delimiters; system commands and attempts to force verdicts are neutralized.
4. **Evidence Enforcement**: Any finding or tactic lacking an exact quote or evidence is automatically discarded by the policy layer.
5. **Advisory Disclaimer**: Every response carries the mandatory consumer disclaimer: *"This is information to help you decide, not legal or financial advice."*

---

## Benchmark Evaluation Results (`eval/report.md`)
Evaluated across **65 labelled benchmark items**:
- **Overall Verdict Accuracy**: **86.2%**
- **False-Positive Rate on Genuine Messages**: **0.0%** (0 / 18 false alarms)
- **Schema Validity Rate**: **100.0%**
- **Prompt-Injection Defense Rate**: **100.0%** (5 / 5 defended)
- **Hindi Language Accuracy**: **100.0%** (10 / 10)
- **Latency (p50)**: **0.3 ms**
- **Estimated Cost**: **~$0.15 per 1,000 requests**

---

## How to Run & Test

```bash
cd services/ai

# Run full automated test suite (16 tests)
.\.venv\Scripts\pytest.exe -v

# Run benchmark evaluation
.\.venv\Scripts\python.exe eval/run_eval.py

# Start FastAPI server (Port 5001)
.\.venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 5001 --reload
```
