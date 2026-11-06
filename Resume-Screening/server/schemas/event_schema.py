from datetime import date, datetime
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    ValidationInfo,
    field_validator,
)


EventStatus = Literal["draft", "open", "closed"]
EmploymentType = Literal["full_time", "internship", "contract"]


class EventFields(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=200)
    job_role: str = Field(min_length=1, max_length=150)
    department: str | None = Field(default=None, max_length=100)
    job_description: str | None = Field(default=None, max_length=10000)
    location: str | None = Field(default=None, max_length=150)
    employment_type: EmploymentType | None = None
    min_exp_years: int = Field(default=0, ge=0)
    openings: int = Field(default=1, gt=0)
    start_date: date | None = None
    end_date: date | None = None

    @field_validator("title", "job_role")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("This field is required.")
        return normalized

    @field_validator("department", "job_description", "location", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not isinstance(value, str):
            return value
        normalized = value.strip()
        return normalized or None

    @field_validator("end_date")
    @classmethod
    def validate_dates(cls, value: date | None, info: ValidationInfo) -> date | None:
        start_date = info.data.get("start_date")
        if start_date and value and value <= start_date:
            raise ValueError("End date must be at least one day after the start date.")
        if value and not start_date and value < date.today():
            raise ValueError("End date cannot be in the past.")
        return value

    @field_validator("start_date")
    @classmethod
    def validate_start_date(cls, value: date | None) -> date | None:
        if value and value < date.today():
            raise ValueError("Start date cannot be in the past.")
        return value


class EventCreate(EventFields):
    pass


class EventUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=200)
    job_role: str | None = Field(default=None, min_length=1, max_length=150)
    department: str | None = Field(default=None, max_length=100)
    job_description: str | None = Field(default=None, max_length=10000)
    location: str | None = Field(default=None, max_length=150)
    employment_type: EmploymentType | None = None
    min_exp_years: int | None = Field(default=None, ge=0)
    openings: int | None = Field(default=None, gt=0)
    start_date: date | None = None
    end_date: date | None = None

    @field_validator("title", "job_role")
    @classmethod
    def validate_required_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            raise ValueError("This field cannot be empty.")
        return normalized

    @field_validator("department", "job_description", "location", mode="before")
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not isinstance(value, str):
            return value
        normalized = value.strip()
        return normalized or None

    @field_validator("end_date")
    @classmethod
    def validate_dates(cls, value: date | None, info: ValidationInfo) -> date | None:
        start_date = info.data.get("start_date")
        if start_date and value and value <= start_date:
            raise ValueError("End date must be at least one day after the start date.")
        if value and not start_date and value < date.today():
            raise ValueError("End date cannot be in the past.")
        return value

    @field_validator("start_date")
    @classmethod
    def validate_start_date(cls, value: date | None) -> date | None:
        if value and value < date.today():
            raise ValueError("Start date cannot be in the past.")
        return value


class EventStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: EventStatus


class EventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    company_id: str
    title: str
    job_role: str
    department: str | None
    job_description: str | None
    location: str | None
    employment_type: str | None
    min_exp_years: int
    openings: int
    start_date: date | None
    end_date: date | None
    status: str
    created_at: datetime
    updated_at: datetime


class EventListResponse(BaseModel):
    events: list[EventResponse]
