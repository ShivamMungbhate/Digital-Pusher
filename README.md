# Digital Pusher 🛡️
> **AI-Powered Guardian Shield against Digital Manipulation, Scams & Predatory Contracts for Seniors and Families.**  
> *Built for the Google Gemini Developer Competition / Hackathon.*

[![Google Gemini 2.5](https://img.shields.io/badge/Gemini-2.5%20Flash-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React PWA](https://img.shields.io/badge/React-18%20PWA-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose%208-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📌 Executive Summary & Problem Statement

Over **$10 billion** is stolen annually through digital fraud, and seniors are disproportionately targeted by aggressive psychological manipulation: **fake arrest threats**, **urgent parcel seizures**, **deceptive dark patterns in digital checkouts**, and **incomprehensible legal documents**. 

When faced with a panic-inducing call, an intimidating legal notice, or a tricky cancellation flow, seniors often have nowhere to turn without feeling embarrassed or waiting hours for busy family members.

**Digital Pusher** is an empathetic, calm, and intelligent digital shield. Seniors forward any suspicious text, voice note, screen recording, or document photo. Within seconds, **Google Gemini 2.5 Flash** evaluates the underlying manipulation tactics, strips away the fear and jargon, returns a clear verdict in plain English or Hindi, and generates an emergency family alert draft.

---

## 🌟 The 3 Operational Modes (One Unified Pipeline)

Digital Pusher unifies three distinct defense capabilities through a single multimodal AI engine:

### 1. 🛡️ Mode A: Scam Guardian
*Target: Suspicious calls, voice recordings, SMS/WhatsApp texts, and chat screenshots.*
- **5-Vector Psychological Analysis**: Evaluates threats against **Urgency**, **Authority Impersonation** (CBI, Police, Customs, TRAI), **Fear & Coercion**, **Secrecy Demands** (*"Don't tell anyone"*), and **Payment Demands** (*Crypto, Gift Cards, instant UPI*).
- **Verbatim Evidence Quotes**: Cites exact phrases from the message proving how the scammer is trying to deceive.
- **Calm Voice Explanations**: In-browser audio synthesis for seniors who prefer listening over reading.
- **Safe Verification Checklist**: Step-by-step guidance on how to independently verify claims without using the scammer's provided contacts.

### 2. 🕵️ Mode B: Dark Pattern Auditor
*Target: Screen recordings, cancellation funnels, and checkout screenshots.*
- **CCPA & FTC Pattern Recognition**: Flags deceptive UX practices including **Drip Pricing**, **Sneak into Basket**, **Confirm Shaming**, **Roach Motels (Hard to Cancel)**, and **Fake Countdown Timers**.
- **Actionable Defense**: Provides timestamps and plain-language explanations of why the design is coercive, plus an auto-drafted cancellation request or formal complaint.

### 3. 📄 Mode C: Paperwork Decoder
*Target: Photos or PDFs of legal notices, recovery letters, rental agreements, and government orders.*
- **Jargon Elimination**: Translates dense legalese into an 8th-grade reading level summary in English or Hindi.
- **Risky Clause Detection**: Identifies aggressive arbitration clauses, unilateral penalty terms, and indemnity risks.
- **Deadline Extractor**: Extracts strict statutory or reply deadlines into a structured calendar-ready schedule.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    User(["👤 Senior User / Family Member"]) --> WebApp["📱 React Vite PWA (Port 3000)\n• In-browser Voice Recorder (MediaRecorder)\n• High-Contrast Senior Typography\n• English & Hindi (i18next)\n• Real-time Polling (TanStack Query)"]

    WebApp -->|REST API + JWT Auth| ExpressAPI["⚙️ Express API Backend (Port 4000)\n• Rate Limiting & Helmet Security\n• Multer Upload Validation (Caps: Audio 25MB, Doc 20MB, Video 100MB)\n• Client PII Masking Engine\n• AES-256-GCM Encrypted Media Storage\n• BullMQ Queue with In-Process Fallback"]

    ExpressAPI -->|Zod Validated HTTP Request| AIService["🧠 Gemini AI Engine (Port 5001 - FastAPI)\n• Google GenAI SDK (google-genai)\n• Gemini 2.5 Flash with response_schema\n• Grounding Knowledge Base (10 Scam Archetypes)\n• Deterministic Policy Guardrails\n• Edge TTS Audio Generator"]

    AIService -->|Gemini API Key| GoogleGemini["✨ Google Gemini 2.5 Flash API\n• Strict Structured JSON Output\n• Fast Multimodal Inference (< 2.5s)"]

    ExpressAPI --> Mongo[("🍃 MongoDB Database\n(Real Mongo or In-Memory Server)")]
