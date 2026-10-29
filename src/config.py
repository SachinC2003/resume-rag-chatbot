from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
PDF_PATH = PROJECT_ROOT / "data" / "Sachin_Chougule_Resume.pdf"
CHROMA_DB_PATH = PROJECT_ROOT / "chroma_db"

CHUNK_SIZE = 600
CHUNK_OVERLAP = 100
LLM_MODEL = "openai/gpt-oss-20b"