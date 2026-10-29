
from src.config import CHUNK_OVERLAP, CHUNK_SIZE


def split_document(document: str) -> list[str]:
    chunk_size = CHUNK_SIZE
    overlap = CHUNK_OVERLAP

    if chunk_size <= 0:
        raise ValueError("Chunk size must be a positive integer.")

    if overlap < 0:
        raise ValueError("Overlap must be a non-negative integer.")

    if overlap >= chunk_size:
        raise ValueError("Chunk overlap must be smaller than the chunk size.")

    chunks = []
    start = 0

    while start < len(document):
        end = start + chunk_size
        chunk = document[start:end].strip()

        if chunk:
            chunks.append(chunk)
        start += chunk_size - overlap

    return chunks