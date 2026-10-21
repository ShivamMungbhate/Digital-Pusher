# Digital Pusher 🛡️
> Protecting seniors and families from online scams, digital manipulation, and predatory contracts.
> Built for the Google Gemini Hackathon.

## System Architecture & Live Ports

```
[React Vite PWA]       -->     [Express API]       -->     [Gemini AI Service]
(port 3000)                   (port 4000)                 (port 5001 - FastAPI)
  ├── Senior UI / Large Text    ├── Auth & Consent          ├── PII Masking
  ├── Voice Recording           ├── AES-256-GCM Storage     ├── RAG Knowledge Base
  ├── Loading Progress Poll     ├── Queue (BullMQ/In-Proc)  ├── Multimodal Analysis
  └── Scam Result Screen        └── Zod Contract Validator  └── Speech Audio Synthesis
```

| Service | Port | Purpose | URL |
| :--- | :--- | :--- | :--- |
| **Web Frontend** | `3000` | Senior-friendly PWA client | [http://localhost:3000](http://localhost:3000) |
| **Backend API** | `4000` | REST API, MongoDB, Storage & Queue | [http://localhost:4000/api/docs](http://localhost:4000/api/docs) |
| **AI Engine** | `5001` | Python FastAPI + Gemini multimodal pipeline | [http://localhost:5001/docs](http://localhost:5001/docs) |

---

## Running the Services

### 1. Zero-Config Local Development
```bash
# Terminal 1: Python AI Service (Port 5001)
cd services/ai
.\.venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 5001

# Terminal 2: Express Backend (Port 4000)
npm run dev:api

# Terminal 3: React Web Frontend (Port 3000)
npm run dev:web
```

### 2. Running Test Suites
```bash
# Run backend tests (Auth, Storage, Submissions, Zod, AES-256)
npm test

# Run AI service tests (PII masking, Policy, Injection defense, Schema)
cd services/ai && .\.venv\Scripts\pytest.exe -v

# Run AI accuracy & false-positive benchmark
cd services/ai && .\.venv\Scripts\python.exe eval/run_eval.py
```

---

## How to Demo the Vertical Slice (Step-by-Step)

1. Open your browser to **[http://localhost:3000](http://localhost:3000)**.
2. Click **"Sign In"** in the top navigation bar.
3. Click the **"Senior Demo"** button to auto-fill the login form, then click **"Sign In to Account"**.
4. On the Home screen, click **"Check something now"** (or click the Mode A **"Suspicious Message or Call"** card).
5. On the Submission page:
   - Click the **"Sample Scam"** helper button (or paste any suspicious message, or click **"Record Voice"** to record audio).
   - Click **"Check for Scams & Tricks"**.
6. **Watch the Calm Progress Screen**: The screen transitions to a soothing progress animation with active status updates while the worker processes the submission.
7. **Scam Result Screen**:
   - **Verdict Banner**: 🔴 **Likely Scam** with high confidence.
   - **Voice Explanation Player**: Stream the senior-friendly audio verdict directly in your browser.
   - **Manipulation Tactics**: Review chips for *Authority*, *Urgency*, *Fear*, and *Payment Demand* with the exact quoted evidence.
   - **Safe Independent-Verification Steps**: Plain-language steps for safety.
   - **Action Buttons**: *"Alert My Family"* and ready-to-copy report drafts.

---

## Key Assumptions & Handled Edge Cases
1. **Local IPv4 vs IPv6 on Windows**: Node.js 24 on Windows can delay on `localhost` IPv6 resolution; the backend automatically targets `http://127.0.0.1:5001` to ensure instant sub-millisecond dispatch.
2. **Database Fallback**: MongoDB connects to `mongodb://localhost:27017/digital_pusher` with an automatic, seamless in-memory fallback if no standalone MongoDB instance is running.
3. **Queue Fallback**: If Redis is not available, the queue operates automatically using an in-process worker queue with identical retry and error handling.
