import re
from server.rag.config import CHUNK_OVERLAP, CHUNK_SIZE
from server.rag.embeddings import model

SECTION_PATTERNS = {
    "skills": [
        "skills", "technical skills", "core competencies",
        "technical expertise"
    ],
    "projects": [
        "projects", "academic projects", "personal projects",
        "key projects"
    ],
    "experience": [
        "experience", "work experience", "professional experience",
        "internship", "internships"
    ],
    "education": [
        "education", "academic background", "educational qualification"
    ]
}


def identify_section(line: str) -> str | None:
    heading = re.sub(r"[^a-zA-Z ]", "", line).strip().lower()

    for section, headings in SECTION_PATTERNS.items():
        if heading in headings:
            return section

    return None


def split_document(document: str) -> list[dict[str, str]]:

    if CHUNK_SIZE <= 0:
        raise ValueError("Chunk size must be positive.")

    if CHUNK_OVERLAP < 0 or CHUNK_OVERLAP >= CHUNK_SIZE:
        raise ValueError("Invalid chunk overlap.")

    # Leave room for special tokens so embedding never truncates an oversized chunk.
    tokenizer = model.tokenizer
    if CHUNK_SIZE + tokenizer.num_special_tokens_to_add(pair=False) > model.max_seq_length:
        raise ValueError(
            "Chunk size plus tokenizer special tokens exceeds the embedding model limit."
        )

    sections = []
    current_section = "general"
    current_text = []

    for line in document.splitlines():

        detected_section = identify_section(line)

        if detected_section:
            if current_text:
                sections.append({
                    "section": current_section,
                    "text": "\n".join(current_text)
                })

            current_section = detected_section
            current_text = [line]

        else:
            current_text.append(line)

    if current_text:
        sections.append({
            "section": current_section,
            "text": "\n".join(current_text)
        })

    # Split each section into overlapping windows measured by the embedding tokenizer.
    chunks = []

    for section_data in sections:
        text = section_data["text"]
        # Tokenize long sections in bounded pieces before building token-sized chunks.
        token_ids = []
        for piece_start in range(0, len(text), 200):
            piece = text[piece_start:piece_start + 200]
            token_ids.extend(
                tokenizer.convert_tokens_to_ids(tokenizer.tokenize(piece))
            )
        start = 0

        while start < len(token_ids):
            end = min(start + CHUNK_SIZE, len(token_ids))
            chunk = tokenizer.decode(
                token_ids[start:end],
                skip_special_tokens=True,
                clean_up_tokenization_spaces=True,
            ).strip()

            if chunk:
                chunks.append({
                    "text": chunk,
                    "section": section_data["section"]
                })

            if end == len(token_ids):
                break

            start = end - CHUNK_OVERLAP

    return chunks
