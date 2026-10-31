import chromadb

from src.config import CHROMA_DB_PATH
from src.classify import classify_query_or_chunk

def store_embeddings_in_vector_db(
    chunks: list[str],
    embeddings: list[list[float]]
) -> None:

    if not chunks:
        raise ValueError("Cannot store embeddings without document chunks.")

    if len(chunks) != len(embeddings):
        raise ValueError("The number of chunks and embeddings must be the same.")

    client = chromadb.PersistentClient(path=str(CHROMA_DB_PATH))

    collection = client.get_or_create_collection(
        name="resume_embeddings"
    )

    # classify the chuncks
    metadatas = [
        {"section": classify_query_or_chunk(chunk)}
        for chunk in chunks
    ]

    # Store the embeddings in the collection
    collection.upsert(
        ids=[f"chunk_{index}" for index in range(len(chunks))],
        documents=chunks,
        embeddings=embeddings,
        metadatas=metadatas
    )

    print(f"Stored {len(chunks)} chunks in ChromaDB")