import os

from dotenv import load_dotenv
from groq import Groq

from src.config import PROJECT_ROOT

load_dotenv(dotenv_path=PROJECT_ROOT / ".env")

api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    raise RuntimeError("GROQ_API_KEY is not set. Add it to the .env file.")

client = Groq(api_key=api_key)
