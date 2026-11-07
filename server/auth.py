import os
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from server.database import get_db
from server.models import Company

bearer_scheme = HTTPBearer(auto_error=False)


def create_access_token(company_id: str) -> str:
    secret = os.getenv("JWT_SECRET_KEY")
    if not secret:
        raise RuntimeError("JWT_SECRET_KEY must be configured before issuing tokens.")
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=int(os.getenv("JWT_ACCESS_TOKEN_MINUTES", "60"))
    )
    return jwt.encode(
        {"sub": company_id, "iat": datetime.now(timezone.utc), "exp": expires_at},
        secret,
        algorithm="HS256",
    )


def get_current_company(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Company:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication is required.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    secret = os.getenv("JWT_SECRET_KEY")
    if not secret:
        raise RuntimeError("JWT_SECRET_KEY must be configured before authenticating.")
    if credentials is None:
        raise unauthorized
    try:
        payload = jwt.decode(credentials.credentials, secret, algorithms=["HS256"])
        company_id = payload.get("sub")
        if not isinstance(company_id, str):
            raise unauthorized
    except jwt.InvalidTokenError as error:
        raise unauthorized from error
    company = db.get(Company, company_id)
    if company is None:
        raise unauthorized
    return company
