import pytest
import os
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.schemas import AnalyzeResponse
from app.resilience import (
    get_input_hash,
    get_cached_analysis,
    set_cached_analysis,
    is_demo_cache_only,
    find_demo_cache_match,
    build_safe_fallback,
    call_gemini_resilient
)

@pytest.mark.asyncio
async def test_cache_hashing_and_persistence():
    text = "Call officer at +91 9876543210 regarding urgent parcel"
    masked_text = "Call officer at [PHONE_1] regarding urgent parcel"
    mode = "scam"
    lang = "en"

    hash1 = get_input_hash(masked_text, mode, lang)
    hash2 = get_input_hash("  " + masked_text.upper() + "  ", mode, lang)
    # Normalized hashing should produce the exact same key
    assert hash1 == hash2

    # Test cache set and get
    fallback = build_safe_fallback("scam", "en")
    set_cached_analysis(hash1, fallback)
    cached = get_cached_analysis(hash1)
    assert cached is not None
    assert cached.verdict == "unclear"
    assert cached.escalate is True

@pytest.mark.asyncio
async def test_cache_hit_on_analyze_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        payload = {
            "text": "Cache verification test message: check your account balance.",
            "mode": "scam",
            "language": "en"
        }

        # First call -> computes and caches
        res1 = await ac.post("/analyze", data=payload)
        assert res1.status_code == 200
        data1 = res1.json()

        # Second call -> serves from cache
        res2 = await ac.post("/analyze", data=payload)
        assert res2.status_code == 200
        data2 = res2.json()

        assert data1["summary"] == data2["summary"]
        assert data1["verdict"] == data2["verdict"]

@pytest.mark.asyncio
async def test_demo_cache_only_mode(monkeypatch):
    # Enable DEMO_CACHE_ONLY
    monkeypatch.setenv("DEMO_CACHE_ONLY", "true")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # Submit known scam demo input
        res = await ac.post(
            "/analyze",
            data={
                "text": "URGENT: This is DCP Crime Branch. A parcel with drugs was seized at Mumbai Airport in your name.",
                "mode": "auto",
                "language": "en"
            }
        )
        assert res.status_code == 200
        data = res.json()
        assert data["verdict"] == "likely_scam"
        assert data["risk"] == "high"
        assert data["escalate"] is True
        assert len(data["tactics"]) > 0

        # Submit known genuine OTP demo input
        res_otp = await ac.post(
            "/analyze",
            data={
                "text": "482910 is your secret OTP for login to HDFC Bank NetBanking. Valid for 10 mins. Do not share.",
                "mode": "auto",
                "language": "en"
            }
        )
        assert res_otp.status_code == 200
        data_otp = res_otp.json()
        assert data_otp["verdict"] == "looks_genuine"
        assert data_otp["risk"] == "low"
        assert data_otp["escalate"] is False

@pytest.mark.asyncio
async def test_safe_fallback_on_invalid_json():
    fallback = build_safe_fallback("scam", "en")
    assert fallback.verdict == "unclear"
    assert fallback.escalate is True
    assert fallback.risk == "medium"
    assert fallback.confidence == 0.5
    assert len(fallback.safeSteps) > 0
    assert "Cybercrime Helpline" in fallback.safeSteps[1]

@pytest.mark.asyncio
async def test_safe_fallback_hindi():
    fallback_hi = build_safe_fallback("scam", "hi")
    assert fallback_hi.verdict == "unclear"
    assert fallback_hi.escalate is True
    assert "सतर्क रहें" in fallback_hi.summary

@pytest.mark.asyncio
async def test_resilient_pipeline_offline_fallback(monkeypatch):
    # Simulate missing/skipped Gemini API key
    monkeypatch.setenv("SKIP_LIVE_GEMINI", "true")

    res, path = call_gemini_resilient("Test prompt without live API", "en")
    assert res is None
    assert path == "local_grounded"
