import os
import uuid
import logging
from pathlib import Path
from typing import Optional
from gtts import gTTS

logger = logging.getLogger("tts")

AUDIO_CACHE_DIR = Path(os.getenv("AUDIO_CACHE_DIR", "./audio_cache"))
AUDIO_CACHE_DIR.mkdir(parents=True, exist_ok=True)

def synthesize_explanation_audio(text: str, language: str = "en") -> Optional[str]:
    """
    Synthesizes speech for the senior explanation and writes an MP3 to audio_cache.
    Returns the endpoint path e.g. '/audio/{uuid}.mp3' or None on failure.
    """
    if not text or len(text.strip()) < 5:
        return None

    # Fast path for benchmark runs or tests
    if os.getenv("SKIP_TTS") == "true" or os.getenv("ENVIRONMENT") == "test":
        audio_id = f"test_{uuid.uuid4().hex[:8]}.mp3"
        (AUDIO_CACHE_DIR / audio_id).write_bytes(b"")
        return f"/audio/{audio_id}"

    try:
        audio_id = f"{uuid.uuid4().hex[:12]}.mp3"
        file_path = AUDIO_CACHE_DIR / audio_id

        # Determine language code for gTTS
        lang_code = "hi" if language.startswith("hi") else "en"

        tts = gTTS(text=text, lang=lang_code, slow=False)
        tts.save(str(file_path))

        return f"/audio/{audio_id}"
    except Exception as e:
        logger.warning(f"TTS synthesis failed gracefully: {e}")
        return None
