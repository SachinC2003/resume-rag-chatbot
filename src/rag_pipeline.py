
import chromadb
import os
from dotenv import load_dotenv
from groq import Groq

from src.config import CHROMA_DB_PATH, LLM_MODEL, PROJECT_ROOT
from src.embeddings import embedding_function

def generate_answer(query: str, context: str) -> str:
    load_dotenv(dotenv_path=PROJECT_ROOT / ".env")

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set. Add it to the .env file.")

    client = Groq(api_key=api_key)

    response = client.chat.completions.create(
        model=LLM_MODEL,
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a helpful resume assistant. "
                    "Answer using only the provided resume context. "
                    "If the answer is missing, say you cannot find "
                    "the information in the resume. Do not invent details."
                ),
            },
            {
                "role": "user",
                "content": f"Resume context:\n{context}\n\nQuestion: {query}",
            },
        ],
        temperature=0.2,
    )

    return response.choices[0].message.content or ""


def run_rag_pipeline(query: str) -> str:
    """Retrieve relevant resume chunks and generate an answer."""

    # 1. Create an embedding for the user's question
    query_embedding = embedding_function([query])[0]

    # 2. Connect to ChromaDB
    client = chromadb.PersistentClient(path=str(CHROMA_DB_PATH))
    collection = client.get_collection(name="resume_embeddings")

    result_count = collection.count()
    if result_count == 0:
        raise RuntimeError("The resume collection is empty. Run the application to index the PDF first.")

    # 3. Retrieve the top 3 relevant chunks
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=min(5, result_count),
    )

    # 4. Extract and combine the retrieved text
    documents = results["documents"][0]
    if not documents:
        raise RuntimeError("No resume content was returned for the question.")
    context = "\n\n".join(documents)

    # 5. Generate the final answer using Groq
    answer = generate_answer(query, context)

    return answer
