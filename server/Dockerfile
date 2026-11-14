FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_NO_PROGRESS=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir uv

COPY server/pyproject.toml server/uv.lock ./server/
RUN uv sync --project server --locked --no-dev

COPY server/ ./server/

ENV RESUME_FOLDER_PATH=/app/server/data \
    CHROMA_DB_PATH=/app/chroma_db

RUN mkdir -p /app/server/data /app/chroma_db

EXPOSE 8000
CMD ["uv", "run", "--project", "server", "--no-sync", "python", "-m", "uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8000"]
