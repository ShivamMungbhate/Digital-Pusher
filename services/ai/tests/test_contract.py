import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.schemas import AnalyzeResponse, HealthResponse

@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.get("/health")
        assert response.status_code == 200
        data = response.json()
        validated = HealthResponse(**data)
        assert validated.status == "healthy"
        assert "fast" in validated.models
        assert "strong" in validated.models

@pytest.mark.asyncio
async def test_analyze_scam_mode():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            "/analyze",
            data={
                "text": "URGENT: This is DCP Sharma from Cyber Crime. Transfer 50,000 immediately or police will arrest you in 2 hours.",
                "mode": "scam",
                "language": "en"
            }
        )
        assert response.status_code == 200
        data = response.json()
        validated = AnalyzeResponse(**data)
        assert validated.mode == "scam"
        assert validated.risk == "high"
        assert validated.verdict == "likely_scam"
        assert len(validated.tactics) > 0
        assert validated.escalate is True
        assert len(validated.safeSteps) > 0

@pytest.mark.asyncio
async def test_analyze_genuine_otp():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            "/analyze",
            data={
                "text": "Your OTP for login to HDFC NetBanking is 482910. Valid for 10 mins. Do not share this OTP with anyone.",
                "mode": "auto",
                "language": "en"
            }
        )
        assert response.status_code == 200
        data = response.json()
        validated = AnalyzeResponse(**data)
        assert validated.mode == "scam"
        assert validated.risk == "low"
        assert validated.verdict == "looks_genuine"
        assert validated.escalate is False

@pytest.mark.asyncio
async def test_analyze_dark_pattern():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            "/analyze",
            data={
                "text": "Checkout screen sneaking Rs 299 insurance and ticking subscription auto-renewal",
                "mode": "dark_pattern",
                "language": "en"
            }
        )
        assert response.status_code == 200
        data = response.json()
        validated = AnalyzeResponse(**data)
        assert validated.mode == "dark_pattern"
        assert validated.verdict == "issues_found"
        assert len(validated.findings) > 0
        assert any(f.type == "basket_sneaking" for f in validated.findings)

@pytest.mark.asyncio
async def test_analyze_paperwork():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            "/analyze",
            data={
                "text": "Tenancy lease clause: vacate premises in 7 days or deposit will be forfeited",
                "mode": "paperwork",
                "language": "en"
            }
        )
        assert response.status_code == 200
        data = response.json()
        validated = AnalyzeResponse(**data)
        assert validated.mode == "paperwork"
        assert validated.verdict == "issues_found"
        assert len(validated.clauses) > 0
        assert len(validated.deadlines) > 0

@pytest.mark.asyncio
async def test_analyze_hindi_response():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            "/analyze",
            data={
                "text": "आपका बिजली कनेक्शन आज रात काट दिया जाएगा। तुरंत 0987654321 पर कॉल करें।",
                "mode": "scam",
                "language": "hi"
            }
        )
        assert response.status_code == 200
        data = response.json()
        validated = AnalyzeResponse(**data)
        assert "धोखाधड़ी" in validated.summary or "मैसेज" in validated.summary
