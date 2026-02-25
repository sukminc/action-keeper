from collections.abc import Generator
import os
import shutil
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app

ARTIFACTS_DIR = Path("artifacts-test")
os.environ.setdefault("ARTIFACTS_DIR", str(ARTIFACTS_DIR))
os.environ.setdefault("VERIFY_BASE_URL", "http://localhost:8000")
os.environ.setdefault("STRIPE_WEBHOOK_SECRET", "test-secret")


@pytest.fixture()
def db_session() -> Generator[Session, None, None]:
    if ARTIFACTS_DIR.exists():
        shutil.rmtree(ARTIFACTS_DIR)
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    # Each test gets its own in-memory DB.
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        future=True,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)

    TestingSessionLocal = sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
        future=True,
    )

    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()
        if ARTIFACTS_DIR.exists():
            shutil.rmtree(ARTIFACTS_DIR)


@pytest.fixture()
def client(db_session: Session) -> Generator[TestClient, None, None]:
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()
