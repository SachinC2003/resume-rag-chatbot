import logging
from datetime import date
from pathlib import Path
from uuid import UUID

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool

from server.auth import get_current_company
from server.database import get_db
from server.models import Company, Event, Resume
from server.rag_runtime import (
    delete_event_resumes,
    delete_resume,
    get_resume_pdf_path,
    index_resume,
    list_indexed_resumes,
    search_candidates,
)
from server.schemas.event_schema import (
    EventCreate,
    EventListResponse,
    EventResponse,
    EventStatusUpdate,
    EventStatus,
    EventUpdate,
)
from server.schemas.resume_schema import (
    ResumeListResponse,
    ResumeUploadResponse,
    ResumeUploadResult,
)
from server.schemas.search_schema import CandidateSearchResult, SearchRequest, SearchResponse

router = APIRouter(prefix="/events", tags=["events"])
logger = logging.getLogger(__name__)


def _owned_event(
    db: Session, company_id: str, event_id: UUID, *, for_update: bool = False
) -> Event:
    query = select(Event).where(
        Event.id == str(event_id), Event.company_id == company_id
    )
    if for_update:
        query = query.with_for_update().execution_options(populate_existing=True)
    event = db.scalar(query)
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found.")
    return event


def _ensure_event_not_expired(event: Event, operation: str) -> None:
    if event.end_date is not None and date.today() > event.end_date:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This event has passed its end date and cannot {operation}.",
        )


def _ensure_recruitment_allowed(event: Event, operation: str) -> None:
    if event.status == "closed":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"This event is closed and cannot {operation}.",
        )
    _ensure_event_not_expired(event, operation)


@router.get("", response_model=EventListResponse)
def get_events(
    event_status: EventStatus | None = Query(default=None, alias="status"),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db),
) -> EventListResponse:
    query = select(Event).where(Event.company_id == company.id)
    if event_status:
        query = query.where(Event.status == event_status)
    events = db.scalars(query.order_by(Event.created_at.desc())).all()
    return EventListResponse(events=[EventResponse.model_validate(event) for event in events])


@router.post("", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    request: EventCreate,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db),
) -> EventResponse:
    event = Event(company_id=company.id, status="draft", **request.model_dump())
    db.add(event)
    db.commit()
    db.refresh(event)
    return EventResponse.model_validate(event)


@router.get("/{event_id}", response_model=EventResponse)
def get_event(
    event_id: UUID,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db),
) -> EventResponse:
    return EventResponse.model_validate(_owned_event(db, company.id, event_id))


@router.patch("/{event_id}", response_model=EventResponse)
def update_event(
    event_id: UUID,
    request: EventUpdate,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db),
) -> EventResponse:
    event = _owned_event(db, company.id, event_id, for_update=True)
    if event.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Only draft events can be edited.",
        )
    _ensure_event_not_expired(event, "be edited")
    updates = request.model_dump(exclude_unset=True)
    required_fields = ("title", "job_role", "min_exp_years", "openings")
    empty_required_field = next(
        (
            field
            for field in required_fields
            if field in updates and updates[field] is None
        ),
        None,
    )
    if empty_required_field is not None:
        raise HTTPException(
            status_code=422,
            detail=[
                {
                    "loc": ["body", empty_required_field],
                    "msg": "This field is required.",
                }
            ],
        )
    start_date = updates.get("start_date", event.start_date)
    end_date = updates.get("end_date", event.end_date)
    if start_date and start_date < date.today():
        raise HTTPException(
            status_code=422,
            detail=[
                {
                    "loc": ["body", "start_date"],
                    "msg": "Start date cannot be in the past.",
                }
            ],
        )
    if start_date and end_date and end_date <= start_date:
        raise HTTPException(
            status_code=422,
            detail=[
                {
                    "loc": ["body", "end_date"],
                    "msg": "End date must be at least one day after the start date.",
                }
            ],
        )
    if end_date and not start_date and end_date < date.today():
        raise HTTPException(
            status_code=422,
            detail=[
                {
                    "loc": ["body", "end_date"],
                    "msg": "End date cannot be in the past.",
                }
            ],
        )
    for field, value in updates.items():
        setattr(event, field, value)
    db.commit()
    db.refresh(event)
    return EventResponse.model_validate(event)


@router.patch("/{event_id}/status", response_model=EventResponse)
def transition_event_status(
    event_id: UUID,
    request: EventStatusUpdate,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db),
) -> EventResponse:
    event = _owned_event(db, company.id, event_id, for_update=True)
    next_status = request.status
    allowed_transition = (event.status, next_status) in {
        ("draft", "open"),
        ("open", "closed"),
    }
    if not allowed_transition:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Event status cannot change from {event.status} to {next_status}.",
        )
    if event.status == "draft":
        _ensure_event_not_expired(event, "be started")
    event.status = next_status
    db.commit()
    db.refresh(event)
    return EventResponse.model_validate(event)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: UUID,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db),
) -> None:
    event = _owned_event(db, company.id, event_id, for_update=True)
    delete_event_resumes(company.id, event.id)
    db.delete(event)
    db.commit()


@router.get("/{event_id}/resumes", response_model=ResumeListResponse)
def get_event_resumes(
    event_id: UUID,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db),
) -> ResumeListResponse:
    event = _owned_event(db, company.id, event_id)
    return ResumeListResponse(
        resumes=list_indexed_resumes(company.id, event.id)
    )


@router.delete(
    "/{event_id}/resumes/{candidate_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_event_resume(
    event_id: UUID,
    candidate_id: str,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db),
) -> None:
    event = _owned_event(db, company.id, event_id, for_update=True)
    _ensure_recruitment_allowed(event, "delete resumes")
    try:
        deleted = delete_resume(company.id, str(event_id), candidate_id, db)
    except Exception as error:
        logger.exception(
            "Resume cleanup failed in event %s.",
            event_id,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                str(error)
                if isinstance(error, RuntimeError)
                else "Resume cleanup failed. Check server logs before retrying."
            ),
        ) from error
    if not deleted:
        raise HTTPException(status_code=404, detail="Resume not found.")


@router.get("/{event_id}/resumes/{candidate_id}/file")
def get_event_resume_pdf(
    event_id: UUID,
    candidate_id: str,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db),
) -> FileResponse:
    event = _owned_event(db, company.id, event_id)
    try:
        resume_path = get_resume_pdf_path(
            company.id, event.id, candidate_id, db
        )
    except RuntimeError as error:
        logger.exception("Could not verify resume PDF for event %s.", event_id)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not safely access this resume PDF.",
        ) from error
    if resume_path is None:
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail="The original resume PDF is no longer available.",
        )
    return FileResponse(
        resume_path,
        media_type="application/pdf",
        filename=resume_path.name,
        content_disposition_type="inline",
    )


@router.post("/{event_id}/resumes", response_model=ResumeUploadResponse)
async def upload_event_resumes(
    event_id: UUID,
    files: list[UploadFile] = File(...),
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db),
) -> ResumeUploadResponse:
    event = _owned_event(db, company.id, event_id, for_update=True)
    _ensure_recruitment_allowed(event, "accept resume uploads")
    if not files:
        raise HTTPException(status_code=422, detail="Select at least one PDF.")

    validated_files: list[tuple[str, bytes]] = []
    seen_filenames: set[str] = set()
    for file in files:
        filename = Path((file.filename or "").replace("\\", "/")).name
        if not filename or filename in {".", ".."}:
            raise HTTPException(status_code=422, detail="A file has an invalid name.")
        if Path(filename).suffix.casefold() != ".pdf":
            raise HTTPException(status_code=422, detail=f"{filename} is not a PDF file.")
        if filename.casefold() in seen_filenames:
            raise HTTPException(
                status_code=422, detail=f"{filename} was selected more than once."
            )
        seen_filenames.add(filename.casefold())
        content = await file.read()
        if b"%PDF-" not in content[:1024]:
            raise HTTPException(
                status_code=422, detail=f"{filename} does not contain a valid PDF header."
            )
        validated_files.append((filename, content))

    results = []
    for filename, content in validated_files:
        event = _owned_event(db, company.id, event_id, for_update=True)
        _ensure_recruitment_allowed(event, "accept resume uploads")
        try:
            result = await run_in_threadpool(
                index_resume, filename, content, company.id, event.id
            )
        except ValueError as error:
            raise HTTPException(
                status_code=422, detail=f"Could not process {filename}: {error}"
            ) from error
        resume_record = db.get(Resume, result["candidate_id"])
        if resume_record and (
            resume_record.company_id != company.id
            or resume_record.event_id != str(event.id)
        ):
            raise HTTPException(status_code=409, detail="Resume ID is already in use.")
        if resume_record is None:
            resume_record = Resume(
                candidate_id=result["candidate_id"],
                company_id=company.id,
                event_id=str(event.id),
                candidate_name=result["candidate_name"],
                filename=result["filename"],
                status=result["status"],
            )
        else:
            resume_record.candidate_name = result["candidate_name"]
            resume_record.filename = result["filename"]
            resume_record.status = result["status"]
        db.add(resume_record)
        db.commit()
        results.append(ResumeUploadResult(**result))
    return ResumeUploadResponse(results=results)


@router.post("/{event_id}/ask", response_model=SearchResponse)
def ask_event(
    event_id: UUID,
    request: SearchRequest,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db),
) -> SearchResponse:
    event = _owned_event(db, company.id, event_id, for_update=True)
    _ensure_recruitment_allowed(event, "run recruiter searches")
    query = request.query.strip()
    if not query:
        raise HTTPException(status_code=422, detail="Enter a search query.")
    try:
        results = search_candidates(query, company.id, event.id)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=409, detail=str(error)) from error
    return SearchResponse(
        query=query,
        results=[CandidateSearchResult(**result) for result in results],
    )
