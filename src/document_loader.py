from pathlib import Path

import pymupdf


def load_document(pdf_path: str | Path) -> str:

    path = Path(pdf_path)

    if not path.exists():
        raise FileNotFoundError(f"The file at {path} does not exist")

    text_parts = []

    with pymupdf.open(str(path)) as pdf:
        for page in pdf:
            text = page.get_text()

            if text.strip():
                text_parts.append(text.strip())

    document_text = "\n".join(text_parts)

    if not document_text:
        raise ValueError("The PDF file is empty or contains no readable text.")

    return document_text