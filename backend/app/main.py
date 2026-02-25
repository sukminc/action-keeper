import json
import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request

from app.api.v1 import router as v1_router
from app.core.config import settings
from app.db.base import Base, init_models
from app.db.session import engine


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        data = {
            "level": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%S"),
        }
        if record.exc_info:
            data["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(data)


handler = logging.StreamHandler()
handler.setFormatter(JsonFormatter())
logging.basicConfig(level=settings.log_level, handlers=[handler])
logger = logging.getLogger("actionkeeper.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_models()
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(lifespan=lifespan)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = round(time.time() - start, 4)
    logger.info(
        "request",
        extra={
            "path": request.url.path,
            "method": request.method,
            "status": response.status_code,
            "duration": duration,
            "client": request.client.host if request.client else "unknown",
        },
    )
    return response


app.include_router(v1_router)
