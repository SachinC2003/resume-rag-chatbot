import os
import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import OperationalError

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

SERVER_ROOT = Path(__file__).resolve().parent

load_dotenv(SERVER_ROOT / ".env")

from server import models
from server.database import Base, ensure_database_exists, get_engine
from server.routes.auth_routes import router as auth_router
from server.routes.event_routes import router as event_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    logger.info("Connecting to PostgreSQL and checking application tables...")
    try:
        ensure_database_exists()
        Base.metadata.create_all(bind=get_engine())
    except (OperationalError, RuntimeError) as error:
        logger.exception(
            "PostgreSQL setup failed during application startup. Check "
            "DATABASE_URL and DATABASE_ADMIN_URL, and confirm the database "
            "server is running and the required roles exist."
        )
        raise RuntimeError(
            "Could not prepare PostgreSQL for application startup. "
            "See the preceding error for configuration guidance."
        ) from error
    logger.info("Database ready; API startup complete.")
    yield


app = FastAPI(title="Resume RAG API", version="1.0.0", lifespan=lifespan)

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(event_router, prefix="/api")


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
