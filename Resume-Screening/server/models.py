from datetime import date, datetime, timezone
from uuid import uuid4

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    Uuid,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from server.database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_person: Mapped[str | None] = mapped_column(String(120))
    phone: Mapped[str | None] = mapped_column(String(30))
    industry: Mapped[str | None] = mapped_column(String(100))
    company_size: Mapped[str | None] = mapped_column(String(20))
    website: Mapped[str | None] = mapped_column(String(255))
    city: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )
    events: Mapped[list["Event"]] = relationship(
        back_populates="company", cascade="all, delete-orphan"
    )


class Event(Base):
    __tablename__ = "events"
    __table_args__ = (
        CheckConstraint("min_exp_years >= 0", name="ck_events_min_exp_years"),
        CheckConstraint("openings > 0", name="ck_events_openings"),
        CheckConstraint(
            "end_date IS NULL OR start_date IS NULL OR end_date >= start_date",
            name="ck_events_date_range",
        ),
    )

    id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False), primary_key=True, default=lambda: str(uuid4())
    )
    company_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("companies.id", ondelete="CASCADE"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    job_role: Mapped[str] = mapped_column(String(150), nullable=False)
    department: Mapped[str | None] = mapped_column(String(100))
    job_description: Mapped[str | None] = mapped_column(Text)
    location: Mapped[str | None] = mapped_column(String(150))
    employment_type: Mapped[str | None] = mapped_column(String(30))
    min_exp_years: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    openings: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(
        String(20), default="draft", server_default=text("'draft'"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False
    )
    company: Mapped[Company] = relationship(back_populates="events")
    resumes: Mapped[list["Resume"]] = relationship(
        back_populates="event", cascade="all, delete-orphan"
    )


class Resume(Base):
    __tablename__ = "resumes"

    candidate_id: Mapped[str] = mapped_column(String(1024), primary_key=True)
    company_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("companies.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    event_id: Mapped[str] = mapped_column(
        Uuid(as_uuid=False),
        ForeignKey("events.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    candidate_name: Mapped[str] = mapped_column(String(255), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="indexed", nullable=False)
    event: Mapped[Event] = relationship(back_populates="resumes")
