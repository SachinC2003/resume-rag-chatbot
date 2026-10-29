import chromadb

from src.config import CHROMA_DB_PATH


def store_embeddings_in_vector_db(
    chunks: list[str],
    embeddings: list[list[float]],
) -> None:

    if not chunks:
        raise ValueError("Cannot store embeddings without document chunks.")

    if len(chunks) != len(embeddings):
        raise ValueError("The number of chunks and embeddings must be the same.")

    client = chromadb.PersistentClient(path=str(CHROMA_DB_PATH))

    collection = client.get_or_create_collection(
        name="resume_embeddings"
    )

    # Store the embeddings in the collection
    collection.upsert(
        ids=[f"chunk_{index}" for index in range(len(chunks))],
        documents=chunks,
        embeddings=embeddings,
    )

    print(f"Stored {len(chunks)} chunks in ChromaDB")