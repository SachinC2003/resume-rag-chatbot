import chromadb

from server.rag.dtos.resume_metadata import ResumeMetadata
from server.rag.config import (
    CHROMA_DB_PATH,
    RESUME_COLLECTION_NAME,
    RESUME_PROFILE_COLLECTION_NAME,
)

def store_embeddings_in_vector_db(
    chunks: list[dict[str, str]],
    embeddings: list[list[float]],
    resume_metadata: ResumeMetadata
) -> None:

    if not chunks:
        raise ValueError("Cannot store embeddings without document chunks.")

    if len(chunks) != len(embeddings):
        raise ValueError("The number of chunks and embeddings must be the same.")

    client = chromadb.PersistentClient(path=str(CHROMA_DB_PATH))

    collection = client.get_or_create_collection(name=RESUME_COLLECTION_NAME)
    profile_collection = client.get_or_create_collection(
        name=RESUME_PROFILE_COLLECTION_NAME
    )

    # Remove old chunks for this resume so re-indexing cannot leave stale entries.
    collection.delete(where={"candidate_id": resume_metadata.candidate_id})

    # Build one profile embedding from this resume's chunk embeddings.
    profile_embedding = [
        sum(embedding[index] for embedding in embeddings) / len(embeddings)
        for index in range(len(embeddings[0]))
    ]
    profile_text = "\n\n".join(
        f"Section: {chunk['section']}\n{chunk['text']}" for chunk in chunks
    )
    profile_collection.upsert(
        ids=[resume_metadata.candidate_id],
        documents=[profile_text],
        embeddings=[profile_embedding],
        metadatas=[
            {
                "candidate_id": resume_metadata.candidate_id,
                "candidate_name": resume_metadata.candidate_name,
                "company_id": resume_metadata.company_id,
                "event_id": resume_metadata.event_id,
                "candidate_name_normalized": (
                    resume_metadata.candidate_name.strip().casefold()
                ),
                "source_file": resume_metadata.source_file,
            }
        ],
    )

    metadatas = [
        {
            "candidate_id": resume_metadata.candidate_id,
            "candidate_name": resume_metadata.candidate_name,
            "company_id": resume_metadata.company_id,
            "event_id": resume_metadata.event_id,
            "candidate_name_normalized": resume_metadata.candidate_name.strip().casefold(),
            "source_file": resume_metadata.source_file,
            "section": chunk["section"],
        }
        for chunk in chunks
    ]

    # Store the embeddings in the collection
    collection.upsert(
        ids=[
            f"{resume_metadata.candidate_id}_chunk_{index}"
            for index in range(len(chunks))
        ],
        documents=[chunk["text"] for chunk in chunks],
        embeddings=embeddings,
        metadatas=metadatas
    )

    print(f"Stored {len(chunks)} chunks in ChromaDB")