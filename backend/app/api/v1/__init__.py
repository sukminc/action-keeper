from fastapi import APIRouter

from app.api.v1.health import router as health_router
from app.api.v1.agreements import router as agreements_router

router = APIRouter(prefix="/api/v1")

router.include_router(health_router)
router.include_router(agreements_router)
