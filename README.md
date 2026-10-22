# Digital Pusher

**Pushing back against digital manipulation.**
An AI guardian that helps people, especially seniors, spot scams, understand the trick in plain language, and get a trusted family member involved before they act. Built for the Google Gemini Hackathon by **Team Mutant Coders**.

---

## The problem
Scams use urgency, fake authority, fear and secrecy ("don't tell anyone") to push people into decisions before they can think. Existing tools block known numbers or links, but they rarely explain *why* something is a scam, in the person's own language, or bring the family in at the right time.

## What Digital Pusher does
- **Scam check:** analyses message text, screenshots, voice notes and call recordings.
- **Tactic breakdown:** names the pressure tactics (urgency, authority, fear, secrecy, payment demand) with quoted evidence.
- **Plain-language replies:** short explanations in Hindi and English, with spoken audio.
- **Safe next steps:** independent verification advice, for example "call the number printed on your bank card, not the one in the message".
- **Family alerts (consent-based):** the senior links a trusted contact, and alerts fire only above a risk threshold.
- **Dark-pattern audit:** finds hidden fees, fake urgency and subscription traps in checkout flows, mapped to consumer-protection categories.
- **Paperwork decoder:** explains notices and agreements, flags risky clauses and deadlines, and drafts a reply.
- **Drafts and exports:** complaint, report and cancellation drafts as PDF, and deadlines as `.ics` calendar files.

> **Status:** see the feature table below for what is working today.

## Feature status
| Feature | Status |
|---|---|
| Auth, roles, senior-to-family consent linking | Done |
| AI service with RAG, PII masking, policy engine, speech output | Done |
| Submission pipeline, encrypted storage, job queue | In progress |
| Scam result screen, audio recorder, upload | In progress |
| Family alerts and dashboard | Planned |
| Dark-pattern and paperwork result screens, exports | Planned |
| Privacy jobs (auto-delete, delete-my-data), seed data | Planned |

*(Update this table as you go.)*

## How it works
```
User (web PWA / Telegram)
        │
        ▼
 Express API ──► Job queue (BullMQ / in-process) ──► Worker
        │                                              │
        ▼                                              ▼
    MongoDB                              Python AI service (FastAPI)
 (users, consents,                       ├─ Router (Gemini)
  submissions,                           ├─ RAG grounding (scam patterns,
  analyses, alerts)                      │   dark-pattern taxonomy, legal snippets)
        │                                ├─ Analyzer (Gemini, structured JSON)
        ▼                                ├─ Policy layer (risk, escalation, disclaimers)
 Family alert engine                     ├─ Drafter (Gemini)
 (email / Telegram)                      └─ Speech output (Gemini TTS)
```

## Where Gemini is used
- **Multimodal understanding:** screenshots, documents, audio and video.
- **Structured output:** every analysis is a typed JSON contract that drives the UI and alerts.
- **Multilingual reasoning and speech:** Hindi and English explanations, with audio.
- **Retrieval grounding:** explanations are tied to a curated pattern library, not invented.
- **Fast and strong model split:** a fast model for routing and analysis, a stronger model for drafts.

Model IDs are configured through environment variables, so they can be swapped without code changes.

## Responsible AI
- **Consent first:** family sharing is opt-in, revocable, and summary-only by default.
- **PII masking:** phone, card and Aadhaar-like numbers are masked before any model call.
- **Honest uncertainty:** low-confidence or high-stakes cases return "unclear" and escalate to human help.
- **No overclaiming:** it flags behavioural tactics only. It does not claim to detect deepfake or cloned voices.
- **Information, not advice:** legal output is general information with citations, never legal advice.
- **Prompt-injection defense:** user content is treated as untrusted data.
- **Privacy controls:** encrypted media at rest, auto-delete, and a delete-my-data endpoint.

## Evaluation
We evaluate on an internal labelled set that includes genuine bank, OTP and delivery messages, so false positives are measured, not assumed.

| Metric | Result |
|---|---|
| Overall accuracy | 86.2% |
| False-positive rate on genuine messages | 0.0% |
| Prompt-injection defense | 100% |

> These figures come from our own small, partly synthetic test set. Treat them as indicative, not as production accuracy. Dataset size and method are documented in `services/ai/eval/report.md`.

## Tech stack
- **Frontend:** React (Vite) PWA, TanStack Query, Tailwind CSS, i18next
- **Backend:** Node.js, Express, Mongoose, Zod, Multer, BullMQ
- **AI service:** Python, FastAPI, Pydantic, Google Gemini API, vector store for retrieval
- **Data:** MongoDB, optional Redis
- **Infra:** Docker Compose

## Repository structure
```
digital-pusher/
  apps/web/             React PWA
  apps/api/             Express API
  services/ai/          Gemini analysis service
  services/ai-mock/     Mock AI service for offline development
  contract/             Shared JSON schema for the AI response
  docker-compose.yml
```

## Getting started

### Prerequisites
Node.js 20+, Python 3.11+, MongoDB, a Gemini API key from [Google AI Studio](https://aistudio.google.com), and optionally Redis and Docker.

### Setup
```bash
git clone https://github.com/<your-org>/digital-pusher.git
cd digital-pusher
cp .env.example .env     # then fill in the values below
```

### Environment variables (main ones)
| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Gemini API key (server side only, never commit it) |
| `GEMINI_FAST_MODEL` / `GEMINI_STRONG_MODEL` | Model IDs for analysis and drafting |
| `GEMINI_TTS_MODEL` / `GEMINI_EMBED_MODEL` | Speech and embedding models |
| `AI_SERVICE_URL` | AI service address (real or mock) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Auth signing secret |
| `MEDIA_ENCRYPTION_KEY` | Key for encrypting stored media |
| `REDIS_URL` | Optional. Falls back to an in-process queue if unset |
| `TELEGRAM_BOT_TOKEN` | Optional, for the Telegram bot |

### Run
```bash
docker compose up        # or start each service manually
npm run seed             # optional demo data
```
Default ports: web `3000`, API `4000`, AI service `5001`.

### Test
```bash
npm test                 # API tests
cd services/ai && pytest # AI service tests
```

## Demo
1. Log in as the demo senior (created by the seed script).
2. Submit a suspicious message or voice note.
3. View the verdict, tactics, spoken explanation and safe steps.
4. Trigger a family alert and open the family dashboard.

## Roadmap
- Website and link risk check
- More regional languages
- Browser warning on checkout pages


## Limitations
- It analyses what the user sends. It does not listen to live calls or monitor accounts.
- It is not a replacement for bank fraud systems.
- Helpline numbers live in `config/helplines.json` and must be verified before use.
- Dark-pattern and legal references are labelled "needs verification" until checked against the official text.


## Disclaimer
Digital Pusher provides general information to help people make safer decisions. It is not legal, financial or law-enforcement advice.

