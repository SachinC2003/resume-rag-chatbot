from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')

def embedding_function(chunks: list[str]) -> list[list[float]]:
    if not chunks:
        raise ValueError("Cannot create embeddings without text chunks.")

    embeddings = model.encode(chunks, convert_to_numpy=True, show_progress_bar=True)

    return embeddings.tolist()