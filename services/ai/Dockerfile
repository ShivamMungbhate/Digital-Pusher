FROM python:3.12-slim

WORKDIR /app

# Install system dependencies for audio/image handling
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY services/ai/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/ai /app

EXPOSE 5001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5001"]
