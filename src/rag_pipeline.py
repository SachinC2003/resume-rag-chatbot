
import chromadb
from src.config import CHROMA_DB_PATH, LLM_MODEL
from src.embeddings import embedding_function
from src.llm_client import client

def generate_answer(query: str, context: str) -> str:
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


def run_rag_pipeline(query: str, enhanced_query: dict | None = None) -> str:
    """Retrieve relevant resume chunks and generate an answer."""

    # 1. Create an embedding for the user's question
    search_queries = (enhanced_query or {}).get("search_queries", [])
    if not search_queries:
        search_queries = [query]

    query_embedding = embedding_function(search_queries)

    # 2. Connect to ChromaDB
    client = chromadb.PersistentClient(path=str(CHROMA_DB_PATH))
    collection = client.get_collection(name="resume_embeddings")

    result_count = collection.count()
    if result_count == 0:
        raise RuntimeError("The resume collection is empty. Run the application to index the PDF first.")

    # 3. Retrieve the top 3 relevant chunks
    results = collection.query(
        query_embeddings=query_embedding,
        n_results=min(5, result_count),
    )

    # 4. Extract and combine the retrieved text
    documents = []

    for query_result in results["documents"]:
        for doc in query_result:
            if doc not in documents:
                documents.append(doc)

    # Limit the total retrieved chunks.
    documents = documents[0:5]
    if not documents:
        raise RuntimeError("No resume content was returned for the question.")
    context = "\n\n".join(documents)

    # 5. Generate the final answer using Groq
    answer = generate_answer(query, context)

    return answer
