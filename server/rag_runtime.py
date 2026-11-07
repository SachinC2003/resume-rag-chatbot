import shutil
import re
import sys
import uuid
from pathlib import Path
from typing import Any

RAG_PROJECT_ROOT = Path(__file__).resolve().parents[1] / "rag-server"
if not RAG_PROJECT_ROOT.is_dir():
    raise RuntimeError(f"RAG project directory not found: {RAG_PROJECT_ROOT}")

rag_project_path = str(RAG_PROJECT_ROOT)
if rag_project_path not in sys.path:
    sys.path.insert(0, rag_project_path)


def _candidate_name_from_filename(filename: str) -> str:
    candidate_name = Path(filename).stem
    if candidate_name.casefold().startswith("resume_"):
        candidate_name = candidate_name[len("resume_"):]
    if candidate_name.casefold().endswith("_resume"):
        candidate_name = candidate_name[:-len("_resume")]
    return candidate_name.replace("_", " ").strip()


def index_resume(
    filename: str, content: bytes, company_id: str, event_id: str
) -> dict[str, str]:
    from src.chunking import split_document
    from src.config import RESUME_FOLDER_PATH
    from src.document_loader import load_document
    from src.dtos.resume_metadata import ResumeMetadata
    from src.embeddings import embedding_function
    from src.vector_store import store_embeddings_in_vector_db

    RESUME_FOLDER_PATH.mkdir(parents=True, exist_ok=True)
    temporary_path = RESUME_FOLDER_PATH / f".upload-{uuid.uuid4().hex}.pdf"
    destination_path = RESUME_FOLDER_PATH / company_id / event_id / filename
    destination_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        temporary_path.write_bytes(content)
        document_text = load_document(temporary_path)
        chunks = split_document(document_text)
        if not chunks:
            raise ValueError("The PDF did not produce any text chunks to index.")

        embeddings = embedding_function([chunk["text"] for chunk in chunks])
        metadata = ResumeMetadata(
            candidate_id=f"{company_id}:{event_id}:{filename.casefold()}",
            candidate_name=_candidate_name_from_filename(filename),
            source_file=filename,
            company_id=company_id,
            event_id=event_id,
        )
        store_embeddings_in_vector_db(chunks, embeddings, metadata)
        temporary_path.replace(destination_path)
    finally:
        temporary_path.unlink(missing_ok=True)

    return {
        "candidate_id": metadata.candidate_id,
        "candidate_name": metadata.candidate_name,
        "filename": filename,
        "status": "indexed",
    }


def list_indexed_resumes(
    company_id: str, event_id: str
) -> list[dict[str, str]]:
    import chromadb

    from src.config import CHROMA_DB_PATH, RESUME_PROFILE_COLLECTION_NAME

    client = chromadb.PersistentClient(path=str(CHROMA_DB_PATH))
    collection = client.get_or_create_collection(
        name=RESUME_PROFILE_COLLECTION_NAME
    )
    metadata_filter = {
        "$and": [
            {"company_id": company_id},
            {"event_id": event_id},
        ]
    }
    profiles = collection.get(where=metadata_filter, include=["metadatas"])

    candidates_by_id: dict[str, dict[str, str]] = {}
    for candidate_id, metadata in zip(profiles["ids"], profiles["metadatas"]):
        if not metadata:
            continue
        candidates_by_id[candidate_id] = {
            "candidate_id": candidate_id,
            "candidate_name": metadata.get("candidate_name", "Unknown candidate"),
            "filename": metadata.get("source_file", ""),
            "status": "indexed",
        }

    return sorted(
        candidates_by_id.values(),
        key=lambda candidate: candidate["candidate_name"].casefold(),
    )


def search_candidates(
    query: str, company_id: str, event_id: str
) -> list[dict[str, str]]:
    import chromadb

    from src.classify import analyze_user_query
    from src.config import CHROMA_DB_PATH, RESUME_PROFILE_COLLECTION_NAME
    from src.query_enhancement import enhance_query
    from src.rag_pipeline import retrieve_shortlisted_candidates

    query_analysis = analyze_user_query(query)
    enhanced_query = enhance_query(query)
    results = retrieve_shortlisted_candidates(
        query=query,
        section=query_analysis["section"] or "general",
        candidate_name=query_analysis["candidate_name"],
        enhanced_query=enhanced_query,
        company_id=company_id,
        event_id=event_id,
    )
    if not results:
        return results

    client = chromadb.PersistentClient(path=str(CHROMA_DB_PATH))
    profiles = client.get_or_create_collection(
        name=RESUME_PROFILE_COLLECTION_NAME
    )
    profile_data = profiles.get(
        ids=[result["candidate_id"] for result in results],
        include=["documents", "metadatas"],
    )
    profiles_by_id = {
        candidate_id: (document or "", metadata or {})
        for candidate_id, document, metadata in zip(
            profile_data["ids"],
            profile_data["documents"],
            profile_data["metadatas"],
        )
    }

    for result in results:
        profile_text, metadata = profiles_by_id.get(
            result["candidate_id"], ("", {})
        )
        if (
            metadata.get("company_id") != company_id
            or metadata.get("event_id") != event_id
        ):
            raise RuntimeError("Shortlisted candidate is outside the requested event.")
        result.update(_extract_candidate_details(profile_text))
    return results


def _extract_candidate_details(text: str) -> dict[str, str | None]:
    email_match = re.search(
        r"(?<![\w.+-])[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@"
        r"[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?"
        r"(?:\.[A-Z0-9](?:[A-Z0-9-]*[A-Z0-9])?)+",
        text,
        re.IGNORECASE,
    )
    phone_match = re.search(
        r"(?im)^\s*(?:phone|mobile|contact(?:\s*(?:number|no\.?))?|"
        r"tel(?:ephone)?)\s*[:\-]\s*(\+?[\d][\d\s().-]{5,}\d)",
        text,
    )
    experience_match = re.search(
        r"\b(?P<amount>\d+(?:\.\d+)?)\s*(?P<plus>\+)?\s*(?:years?|yrs?)"
        r"(?:\s+of)?\s+(?:(?:relevant|professional|work)\s+)?experience\b"
        r"|\b(?:total\s+|professional\s+|work\s+)?experience\s*[:\-]\s*"
        r"(?P<label_amount>\d+(?:\.\d+)?)\s*(?P<label_plus>\+)?\s*"
        r"(?:years?|yrs?)\b",
        text,
        re.IGNORECASE,
    )

    phone = phone_match.group(1).strip() if phone_match else None
    if phone and not 7 <= sum(character.isdigit() for character in phone) <= 15:
        phone = None

    experience_years = None
    if experience_match:
        amount = experience_match.group("amount") or experience_match.group(
            "label_amount"
        )
        plus = experience_match.group("plus") or experience_match.group(
            "label_plus"
        )
        experience_years = f"{amount}{plus or ''} years"

    return {
        "email": email_match.group(0).rstrip(".,;:") if email_match else None,
        "phone": phone,
        "experience_years": experience_years,
    }


def get_resume_pdf_path(
    company_id: str, event_id: str, candidate_id: str, db: Any
) -> Path | None:
    import chromadb

    from server.models import Resume
    from src.config import CHROMA_DB_PATH, RESUME_FOLDER_PATH, RESUME_PROFILE_COLLECTION_NAME

    resume_record = db.get(Resume, candidate_id)
    if resume_record and (
        resume_record.company_id != company_id
        or resume_record.event_id != event_id
    ):
        return None

    client = chromadb.PersistentClient(path=str(CHROMA_DB_PATH))
    profiles = client.get_or_create_collection(
        name=RESUME_PROFILE_COLLECTION_NAME
    )
    profile = profiles.get(ids=[candidate_id], include=["metadatas"])
    metadata = next(iter(profile["metadatas"] or []), None)
    if metadata and (
        metadata.get("company_id") != company_id
        or metadata.get("event_id") != event_id
    ):
        return None
    if resume_record is None and metadata is None:
        return None

    filenames = {
        filename
        for filename in (
            resume_record.filename if resume_record else None,
            metadata.get("source_file") if metadata else None,
        )
        if filename
    }
    if len(filenames) != 1:
        raise RuntimeError("Resume storage metadata is missing or inconsistent.")

    filename = filenames.pop()
    if Path(filename).name != filename or filename in {"", ".", ".."}:
        raise RuntimeError("Resume storage metadata contains an invalid filename.")

    resume_root = RESUME_FOLDER_PATH.resolve()
    resume_directory = (resume_root / company_id / event_id).resolve()
    if not resume_directory.is_relative_to(resume_root):
        raise RuntimeError("Resume storage path is outside the configured data directory.")
    resume_path = (resume_directory / filename).resolve()
    if not resume_path.is_relative_to(resume_directory):
        raise RuntimeError("Resume file resolves outside its event directory.")
    if not resume_path.is_file():
        return None
    with resume_path.open("rb") as pdf_file:
        if pdf_file.read(5) != b"%PDF-":
            raise RuntimeError("Stored resume is not a valid PDF.")
    return resume_path


def delete_event_resumes(company_id: str, event_id: str) -> None:
    import chromadb

    from src.config import (
        CHROMA_DB_PATH,
        RESUME_FOLDER_PATH,
        RESUME_COLLECTION_NAME,
        RESUME_PROFILE_COLLECTION_NAME,
    )

    client = chromadb.PersistentClient(path=str(CHROMA_DB_PATH))
    metadata_filter = {
        "$and": [
            {"company_id": company_id},
            {"event_id": event_id},
        ]
    }
    for collection_name in (
        RESUME_COLLECTION_NAME,
        RESUME_PROFILE_COLLECTION_NAME,
    ):
        collection = client.get_or_create_collection(name=collection_name)
        collection.delete(where=metadata_filter)
    event_directory = RESUME_FOLDER_PATH / company_id / event_id
    if event_directory.exists():
        shutil.rmtree(event_directory)


def _restore_chroma_records(collection: Any, snapshot: dict[str, Any]) -> None:
    if not snapshot["ids"]:
        return

    records: dict[str, Any] = {"ids": snapshot["ids"]}
    for field in ("documents", "metadatas", "embeddings"):
        values = snapshot.get(field)
        if values is not None:
            if field == "embeddings" and hasattr(values, "tolist"):
                values = values.tolist()
            records[field] = values
    collection.upsert(**records)


def delete_resume(
    company_id: str, event_id: str, candidate_id: str, db: Any
) -> bool:
    import chromadb

    from src.config import (
        CHROMA_DB_PATH,
        RESUME_COLLECTION_NAME,
        RESUME_FOLDER_PATH,
        RESUME_PROFILE_COLLECTION_NAME,
    )

    from server.models import Resume

    resume_record = db.get(Resume, candidate_id)
    if resume_record and (
        resume_record.company_id != company_id
        or resume_record.event_id != event_id
    ):
        return False

    client = chromadb.PersistentClient(path=str(CHROMA_DB_PATH))
    profiles = client.get_or_create_collection(
        name=RESUME_PROFILE_COLLECTION_NAME
    )
    profile_snapshot = profiles.get(
        ids=[candidate_id],
        include=["documents", "metadatas", "embeddings"],
    )
    profile_metadata = next(iter(profile_snapshot["metadatas"] or []), None)
    if profile_metadata and (
        profile_metadata.get("company_id") != company_id
        or profile_metadata.get("event_id") != event_id
    ):
        return False

    chunks = client.get_or_create_collection(name=RESUME_COLLECTION_NAME)
    chunk_snapshot = chunks.get(
        where={"candidate_id": candidate_id},
        include=["documents", "metadatas", "embeddings"],
    )
    chunk_metadatas = chunk_snapshot["metadatas"] or []
    if any(
        not metadata
        or metadata.get("company_id") != company_id
        or metadata.get("event_id") != event_id
        for metadata in chunk_metadatas
    ):
        return False

    filenames = {
        filename
        for filename in (
            resume_record.filename if resume_record else None,
            profile_metadata.get("source_file") if profile_metadata else None,
            *(
                metadata.get("source_file")
                for metadata in chunk_metadatas
                if metadata
            ),
        )
        if filename
    }
    if not resume_record and not profile_snapshot["ids"] and not chunk_snapshot["ids"]:
        return False
    if len(filenames) != 1:
        raise RuntimeError("Resume storage metadata is missing or inconsistent.")

    filename = filenames.pop()
    if Path(filename).name != filename or filename in {"", ".", ".."}:
        raise RuntimeError("Resume storage metadata contains an invalid filename.")

    resume_root = RESUME_FOLDER_PATH.resolve()
    resume_directory = (resume_root / company_id / event_id).resolve()
    if not resume_directory.is_relative_to(resume_root):
        raise RuntimeError("Resume storage path is outside the configured data directory.")
    resume_path = resume_directory / filename
    quarantine_path = resume_directory / f".delete-{uuid.uuid4().hex}.pending"
    if resume_path.exists() and not resume_path.is_file():
        raise RuntimeError("The stored resume path is not a regular file.")

    record_snapshot = (
        {
            "candidate_id": resume_record.candidate_id,
            "company_id": resume_record.company_id,
            "event_id": resume_record.event_id,
            "candidate_name": resume_record.candidate_name,
            "filename": resume_record.filename,
            "status": resume_record.status,
        }
        if resume_record
        else None
    )
    ownership_filter = {
        "$and": [
            {"candidate_id": candidate_id},
            {"company_id": company_id},
            {"event_id": event_id},
        ]
    }
    file_staged = False
    chunks_deleted = False
    profile_deleted = False

    try:
        if resume_path.is_file():
            resume_path.replace(quarantine_path)
            file_staged = True
        if chunk_snapshot["ids"]:
            chunks_deleted = True
            chunks.delete(where=ownership_filter)
        if profile_snapshot["ids"]:
            profile_deleted = True
            profiles.delete(ids=[candidate_id])
        if resume_record:
            db.delete(resume_record)
            db.commit()
        if file_staged:
            quarantine_path.unlink()
    except Exception as error:
        recovery_errors: list[Exception] = []
        if record_snapshot:
            try:
                db.rollback()
                if db.get(Resume, candidate_id) is None:
                    db.add(Resume(**record_snapshot))
                    db.commit()
            except Exception as recovery_error:
                recovery_errors.append(recovery_error)
                db.rollback()
        if chunks_deleted:
            try:
                _restore_chroma_records(chunks, chunk_snapshot)
            except Exception as recovery_error:
                recovery_errors.append(recovery_error)
        if profile_deleted:
            try:
                _restore_chroma_records(profiles, profile_snapshot)
            except Exception as recovery_error:
                recovery_errors.append(recovery_error)
        if file_staged:
            try:
                if quarantine_path.exists():
                    if resume_path.exists():
                        raise RuntimeError(
                            "Both the original and recovery PDF paths exist."
                        )
                    quarantine_path.replace(resume_path)
                elif not resume_path.exists():
                    raise RuntimeError("The staged resume PDF is missing.")
            except Exception as recovery_error:
                recovery_errors.append(recovery_error)
        if recovery_errors:
            raise RuntimeError(
                "Resume deletion failed and automatic recovery was incomplete. "
                "Contact support before retrying."
            ) from ExceptionGroup(
                "Resume deletion and recovery errors",
                [error, *recovery_errors],
            )
        raise RuntimeError(
            "Resume deletion failed. The original data was restored; please retry."
        ) from error

    return True
