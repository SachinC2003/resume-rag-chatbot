import os
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
RESUME_FOLDER_PATH = Path(
    os.environ.get("RESUME_FOLDER_PATH", str(PROJECT_ROOT / "data"))
).resolve()
CHROMA_DB_PATH = Path(
    os.environ.get("CHROMA_DB_PATH", str(PROJECT_ROOT.parent / "chroma_db"))
).resolve()
RESUME_COLLECTION_NAME = "resume"
RESUME_PROFILE_COLLECTION_NAME = "resume_profiles"

# These chunk settings are measured in embedding-model tokens, not characters.
CHUNK_SIZE = 220
CHUNK_OVERLAP = 30
LLM_MODEL = "openai/gpt-oss-20b"