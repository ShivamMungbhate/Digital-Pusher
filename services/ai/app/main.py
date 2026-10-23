import os
import time
import asyncio
import logging
from typing import Optional
from pathlib import Path
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from dotenv import load_dotenv

from app.schemas import AnalyzeResponse, HealthResponse
from app.router import classify_mode
from app.media.preprocessor import preprocess_media
from app.pipelines.scam import analyze_scam_submission
from app.pipelines.dark_pattern import analyze_dark_pattern_submission
from app.pipelines.paperwork import analyze_paperwork_submission
from app.safety.pii import mask_pii
from app.resilience import (
    get_input_hash,
    get_cached_analysis,
    set_cached_analysis,
    is_demo_cache_only,
    find_demo_cache_match,
    build_safe_fallback
)

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("ai_service")

FAST_MODEL = os.getenv("GEMINI_FAST_MODEL", "gemini-2.0-flash")
STRONG_MODEL = os.getenv("GEMINI_STRONG_MODEL", "gemini-2.5-flash")
EMBED_MODEL = os.getenv("GEMINI_EMBED_MODEL", "text-embedding-004")
TTS_MODEL = os.getenv("GEMINI_TTS_MODEL", "gemini-2.0-flash")
AUDIO_CACHE_DIR = Path(os.getenv("AUDIO_CACHE_DIR", "./audio_cache"))
AUDIO_CACHE_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="Digital Pusher - Gemini AI Analysis Service",
    description="Drop-in Gemini analysis service protecting seniors from digital deception, scams, dark patterns, and predatory contracts.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root_index():
    return {
        "name": "Digital Pusher - Gemini AI Analysis Service",
        "status": "running",
        "documentation": "http://localhost:5001/docs",
        "healthCheck": "http://localhost:5001/health",
        "webApp": "http://localhost:3000"
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        service="digital-pusher-ai-service",
        version="1.0.0",
        models={
            "fast": FAST_MODEL,
            "strong": STRONG_MODEL,
            "embed": EMBED_MODEL,
            "tts": TTS_MODEL
        }
    )

@app.get("/audio/{audio_id}")
async def get_audio(audio_id: str):
    file_path = AUDIO_CACHE_DIR / f"{audio_id}"
    if not file_path.exists():
        file_path = AUDIO_CACHE_DIR / f"{audio_id}.mp3"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(file_path, media_type="audio/mpeg")

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze_submission(
    file: Optional[UploadFile] = File(None),
    text: Optional[str] = Form(None),
    mode: str = Form("auto"),
    language: str = Form("en"),
    submissionId: Optional[str] = Form(None)
):
    try:
        # 1. Intake & Media Preprocessing
        extracted_media_text = ""
        filename = file.filename if file else ""
        content_type = file.content_type if file else ""

        if file:
            file_bytes = await file.read()
            extracted_media_text = preprocess_media(file_bytes, content_type, filename)

        combined_text = f"{text or ''}\n{extracted_media_text}".strip()
        if not combined_text:
            combined_text = "[Empty or non-text submission]"

        # 2. PII Masking and Input Hash for Caching
        masked_text, pii_map = mask_pii(combined_text)
        cache_key = get_input_hash(masked_text, mode, language)

        # 3. DEMO_CACHE_ONLY & Cache Lookup
        if is_demo_cache_only():
            demo_match = find_demo_cache_match(masked_text, mode)
            if demo_match:
                logger.info("Analysis served via DEMO_CACHE_ONLY mode. Path: demo_cache")
                return demo_match

        cached_response = get_cached_analysis(cache_key)
        if cached_response:
            logger.info("Analysis served from cache. Path: cache_hit")
            return cached_response

        # 4. Mode Classification / Routing
        selected_mode = mode
        if selected_mode == "auto":
            selected_mode, confidence = classify_mode(combined_text, filename, content_type)

        # 5. Pipeline Dispatch
        if selected_mode == "scam":
            response = analyze_scam_submission(combined_text, language, submissionId)
        elif selected_mode == "dark_pattern":
            response = analyze_dark_pattern_submission(combined_text, language, submissionId)
        elif selected_mode == "paperwork":
            response = analyze_paperwork_submission(combined_text, language, submissionId)
        else:
            response = analyze_scam_submission(combined_text, language, submissionId)

        # 6. Save in Cache
        set_cached_analysis(cache_key, response)
        return response

    except Exception as e:
        logger.error(f"Error in pipeline execution: {e}", exc_info=True)
        # Safe fallback response on failure
        return build_safe_fallback(mode, language)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "5001"))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("app.main:app", host=host, port=port, reload=True)
