import json
import logging
import os
import time
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1 import router as v1_router
from app.core.config import settings
from app.db.base import Base, init_models
from app.db.session import engine

# Standard logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("actionkeeper.api")

def run_migrations() -> None:
    if "ALEMBIC_SKIP" in os.environ:
        return
    try:
        from alembic import command
        from alembic.config import Config
    except ImportError:
        logger.warning("Alembic not installed; skipping migrations")
        return

    url = engine.url
    project_root = Path(__file__).resolve().parents[1]
    cfg_path = project_root / "alembic.ini"
    alembic_cfg = Config(str(cfg_path))
    
    # Use render_as_string to avoid masked password in connection string
    alembic_cfg.set_main_option("sqlalchemy.url", url.render_as_string(hide_password=False))
    
    script_location = project_root / "alembic"
    alembic_cfg.set_main_option("script_location", str(script_location))
    command.upgrade(alembic_cfg, "head")

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_models()
    # Migration is the source of truth, but ensure tables exist
    # Base.metadata.create_all(bind=engine)
    try:
        run_migrations()
    except Exception as e:
        logger.error(f"Migration failed: {e}")
    yield

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    try:
        response = await call_next(request)
        duration = round(time.time() - start, 4)
        logger.info(f"{request.method} {request.url.path} - {response.status_code} ({duration}s)")
        return response
    except Exception as e:
        import traceback
        traceback.print_exc()
        logger.error(f"Request failed: {e}")
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=500, content={"detail": str(e)})

app.include_router(v1_router)
