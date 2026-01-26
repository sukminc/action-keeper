from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.v1 import router as v1_router
from app.db.base import Base, init_models
from app.db.session import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_models()
    Base.metadata.create_all(bind=engine)

    yield

    # Shutdown: nothing to dispose for now.


app = FastAPI(lifespan=lifespan)
app.include_router(v1_router)
