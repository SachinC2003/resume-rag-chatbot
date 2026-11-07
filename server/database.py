import os
from collections.abc import Generator
from functools import lru_cache

import psycopg
from psycopg import sql
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine, URL, make_url
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker


class Base(DeclarativeBase):
    pass


def _database_url() -> URL:
    value = os.getenv("DATABASE_URL")
    if not value:
        raise RuntimeError("DATABASE_URL must be set to connect to PostgreSQL.")
    if value.startswith("postgres://"):
        value = value.replace("postgres://", "postgresql+psycopg://", 1)
    elif value.startswith("postgresql://"):
        value = value.replace("postgresql://", "postgresql+psycopg://", 1)
    url = make_url(value)
    if url.get_backend_name() != "postgresql":
        raise RuntimeError("DATABASE_URL must use PostgreSQL.")
    return url


def _psycopg_conninfo(url: URL) -> str:
    return url.set(drivername="postgresql").render_as_string(hide_password=False)


def ensure_database_exists() -> None:
    target_url = _database_url()
    if not target_url.database:
        raise RuntimeError("DATABASE_URL must include a PostgreSQL database name.")

    target_error: psycopg.Error | None = None
    try:
        with psycopg.connect(
            _psycopg_conninfo(target_url), connect_timeout=5
        ):
            return
    except psycopg.Error as error:
        target_error = error

    admin_value = os.getenv("DATABASE_ADMIN_URL")
    if not admin_value:
        raise RuntimeError(
            "Could not connect using DATABASE_URL. If the application "
            "database does not exist, set DATABASE_ADMIN_URL to an existing "
            "maintenance database (usually 'postgres') with permission to "
            "create databases."
        ) from target_error

    admin_url = make_url(admin_value)
    if admin_url.get_backend_name() != "postgresql":
        raise RuntimeError("DATABASE_ADMIN_URL must use PostgreSQL.")
    if not admin_url.database:
        raise RuntimeError(
            "DATABASE_ADMIN_URL must connect to an existing maintenance "
            "database such as 'postgres'."
        )
    if admin_url.database == target_url.database:
        admin_url = admin_url.set(database="postgres")
    if not target_url.username:
        raise RuntimeError(
            "DATABASE_URL must include the application database owner username."
        )
    if target_error is None:
        raise RuntimeError("Could not verify the PostgreSQL application database.")

    try:
        with psycopg.connect(
            _psycopg_conninfo(admin_url),
            connect_timeout=5,
            autocommit=True,
        ) as connection:
            database_exists = connection.execute(
                "SELECT 1 FROM pg_database WHERE datname = %s",
                (target_url.database,),
            ).fetchone()
            if database_exists:
                raise RuntimeError(
                    "The application database exists, but DATABASE_URL "
                    "could not connect to it. Check its username, password, "
                    "host, and database permissions."
                ) from target_error
            try:
                connection.execute(
                    sql.SQL("CREATE DATABASE {} OWNER {}").format(
                        sql.Identifier(target_url.database),
                        sql.Identifier(target_url.username),
                    )
                )
            except psycopg.errors.DuplicateDatabase:
                pass
    except RuntimeError:
        raise
    except psycopg.Error as error:
        raise RuntimeError(
            f"Could not create or inspect database {target_url.database!r}. "
            "Check DATABASE_ADMIN_URL credentials and privileges, and "
            "confirm the application role in DATABASE_URL already exists."
        ) from error


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    return create_engine(
        _database_url(),
        connect_args={"connect_timeout": 5},
        pool_pre_ping=True,
    )


@lru_cache(maxsize=1)
def get_session_factory() -> sessionmaker[Session]:
    return sessionmaker(
        bind=get_engine(), autoflush=False, expire_on_commit=False
    )


def get_db() -> Generator[Session, None, None]:
    session = get_session_factory()()
    try:
        yield session
    finally:
        session.close()
