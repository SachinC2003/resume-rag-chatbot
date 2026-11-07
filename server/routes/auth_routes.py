import os

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from server.auth import create_access_token, get_current_company
from server.database import get_db
from server.models import Company
from server.schemas.auth_schema import (
    AuthResponse,
    CompanyLogin,
    CompanyRegister,
    CompanyResponse,
    CompanyUpdate,
)

router = APIRouter(tags=["auth"])


def _auth_response(company: Company) -> AuthResponse:
    return AuthResponse(
        access_token=create_access_token(company.id),
        company=CompanyResponse.model_validate(company),
    )


@router.post(
    "/auth/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
)
def register_company(
    request: CompanyRegister, db: Session = Depends(get_db)
) -> AuthResponse:
    if not os.getenv("JWT_SECRET_KEY"):
        raise RuntimeError("JWT_SECRET_KEY must be configured before registration.")
    company = Company(
        name=request.name.strip(),
        email=request.email,
        password_hash=bcrypt.hashpw(
            request.password.encode("utf-8"), bcrypt.gensalt()
        ).decode("ascii"),
        contact_person=request.contact_person,
        phone=request.phone,
        industry=request.industry,
        company_size=request.company_size,
        website=request.website,
        city=request.city,
    )
    db.add(company)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        ) from error
    db.refresh(company)
    return _auth_response(company)


@router.post("/auth/login", response_model=AuthResponse)
def login_company(
    request: CompanyLogin, db: Session = Depends(get_db)
) -> AuthResponse:
    email = request.email.strip().casefold()
    company = db.scalar(select(Company).where(Company.email == email))
    password_bytes = request.password.encode("utf-8")
    if (
        company is None
        or len(password_bytes) > 72
        or not bcrypt.checkpw(
            password_bytes,
            company.password_hash.encode("ascii"),
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _auth_response(company)


@router.get("/companies/me", response_model=CompanyResponse)
def get_company_profile(
    company: Company = Depends(get_current_company),
) -> CompanyResponse:
    return CompanyResponse.model_validate(company)


@router.patch("/companies/me", response_model=CompanyResponse)
def update_company_profile(
    request: CompanyUpdate,
    company: Company = Depends(get_current_company),
    db: Session = Depends(get_db),
) -> CompanyResponse:
    updates = request.model_dump(exclude_unset=True)
    if updates.get("name") is None and "name" in updates:
        raise HTTPException(status_code=422, detail="Company name cannot be empty.")
    for field, value in updates.items():
        setattr(company, field, value.strip() if isinstance(value, str) else value)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=409, detail="An account with this email already exists."
        ) from error
    db.refresh(company)
    return CompanyResponse.model_validate(company)
