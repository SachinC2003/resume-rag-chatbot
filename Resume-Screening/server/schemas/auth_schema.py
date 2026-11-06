import re
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CompanyFields(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: str = Field(min_length=5, max_length=255)
    contact_person: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=30)
    industry: str | None = Field(default=None, max_length=100)
    company_size: str | None = Field(default=None, max_length=20)
    website: str | None = Field(default=None, max_length=255)
    city: str | None = Field(default=None, max_length=100)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Company name is required.")
        return normalized

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().casefold()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", normalized):
            raise ValueError("Enter a valid email address.")
        return normalized

    @field_validator(
        "contact_person", "phone", "industry", "company_size", "website", "city",
        mode="before",
    )
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not isinstance(value, str):
            return value
        normalized = value.strip()
        return normalized or None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        if value is not None and not re.fullmatch(r"\+?[0-9().\-\s]{7,30}", value):
            raise ValueError("Enter a valid phone number.")
        return value

    @field_validator("company_size")
    @classmethod
    def validate_company_size(cls, value: str | None) -> str | None:
        allowed_sizes = {"1-10", "11-50", "51-200", "200+"}
        if value is not None and value not in allowed_sizes:
            raise ValueError("Select a valid company size.")
        return value

    @field_validator("website")
    @classmethod
    def validate_website(cls, value: str | None) -> str | None:
        if value is None:
            return None
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("Enter a valid website URL beginning with http:// or https://.")
        return value


class CompanyRegister(CompanyFields):
    password: str = Field(min_length=8, max_length=72)

    @field_validator("password")
    @classmethod
    def validate_password_bytes(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 UTF-8 bytes.")
        return value


class CompanyUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=200)
    contact_person: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=30)
    industry: str | None = Field(default=None, max_length=100)
    company_size: str | None = Field(default=None, max_length=20)
    website: str | None = Field(default=None, max_length=255)
    city: str | None = Field(default=None, max_length=100)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            raise ValueError("Company name is required.")
        return normalized

    @field_validator(
        "contact_person", "phone", "industry", "company_size", "website", "city",
        mode="before",
    )
    @classmethod
    def normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        if not isinstance(value, str):
            return value
        normalized = value.strip()
        return normalized or None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str | None) -> str | None:
        if value is not None and not re.fullmatch(r"\+?[0-9().\-\s]{7,30}", value):
            raise ValueError("Enter a valid phone number.")
        return value

    @field_validator("company_size")
    @classmethod
    def validate_company_size(cls, value: str | None) -> str | None:
        allowed_sizes = {"1-10", "11-50", "51-200", "200+"}
        if value is not None and value not in allowed_sizes:
            raise ValueError("Select a valid company size.")
        return value

    @field_validator("website")
    @classmethod
    def validate_website(cls, value: str | None) -> str | None:
        if value is None:
            return None
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("Enter a valid website URL beginning with http:// or https://.")
        return value


class CompanyLogin(BaseModel):
    email: str = Field(min_length=5, max_length=255)
    password: str = Field(min_length=1)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.strip().casefold()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", normalized):
            raise ValueError("Enter a valid email address.")
        return normalized

    @field_validator("password")
    @classmethod
    def validate_password_bytes(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 UTF-8 bytes.")
        return value


class CompanyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    email: str
    contact_person: str | None
    phone: str | None
    industry: str | None
    company_size: str | None
    website: str | None
    city: str | None


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    company: CompanyResponse
