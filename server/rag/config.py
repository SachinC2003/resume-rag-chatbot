from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
RESUME_FOLDER_PATH = PROJECT_ROOT / "data"
CHROMA_DB_PATH = PROJECT_ROOT.parent / "chroma_db"
RESUME_COLLECTION_NAME = "resume"
RESUME_PROFILE_COLLECTION_NAME = "resume_profiles"

# These chunk settings are measured in embedding-model tokens, not characters.
CHUNK_SIZE = 220
CHUNK_OVERLAP = 30
LLM_MODEL = "openai/gpt-oss-20b"