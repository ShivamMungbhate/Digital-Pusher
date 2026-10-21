import io
import logging
from typing import Optional
from pypdf import PdfReader

logger = logging.getLogger("media")

def extract_pdf_content(file_bytes: bytes) -> str:
    """Extracts text from PDF bytes; falls back gracefully if scanned or encrypted."""
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        extracted_pages = []
        for i, page in enumerate(reader.pages[:10]):  # First 10 pages for analysis
            text = page.extract_text()
            if text:
                extracted_pages.append(f"--- Page {i+1} ---\n{text}")
        if extracted_pages:
            return "\n\n".join(extracted_pages)
        return "[PDF document contains scanned pages or images without embedded selectable text]"
    except Exception as e:
        logger.warning(f"PDF extraction error: {e}")
        return ""

def preprocess_media(file_bytes: Optional[bytes], content_type: str, filename: str) -> str:
    """Intake preprocessor returning text content or descriptions from uploaded files."""
    if not file_bytes:
        return ""

    content_type_lower = (content_type or "").lower()
    filename_lower = (filename or "").lower()

    if "pdf" in content_type_lower or filename_lower.endswith(".pdf"):
        return extract_pdf_content(file_bytes)

    if "text" in content_type_lower or filename_lower.endswith(".txt"):
        try:
            return file_bytes.decode("utf-8", errors="replace")
        except Exception:
            return ""

    if "audio" in content_type_lower:
        return f"[Audio file uploaded: {filename}, size: {len(file_bytes)} bytes]"

    if "video" in content_type_lower:
        return f"[Screen recording video uploaded: {filename}, size: {len(file_bytes)} bytes]"

    if "image" in content_type_lower:
        return f"[Image screenshot uploaded: {filename}, size: {len(file_bytes)} bytes]"

    return ""
