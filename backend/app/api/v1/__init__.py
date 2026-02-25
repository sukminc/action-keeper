from fastapi import APIRouter, Depends

from app.api.deps import require_api_token
from app.api.v1 import agreements, health, payments, trip_planner, verification

router = APIRouter(prefix="/api/v1")
secure_dependencies = [Depends(require_api_token)]

router.include_router(health.router)
router.include_router(agreements.router, dependencies=secure_dependencies)
router.include_router(verification.router, dependencies=secure_dependencies)
router.include_router(payments.router, dependencies=secure_dependencies)
router.include_router(trip_planner.router, dependencies=secure_dependencies)
