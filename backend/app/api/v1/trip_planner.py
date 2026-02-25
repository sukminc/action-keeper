from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.trip_planner_service import TripPlannerService

router = APIRouter(prefix="/trip-planner", tags=["trip-planner"])
service = TripPlannerService()


class TripPlanRequest(BaseModel):
    destination: str = Field(..., min_length=2)
    days: int = Field(..., ge=1, le=30)
    bankroll: float = Field(..., gt=0)


@router.post("/plan")
def plan_trip(payload: TripPlanRequest):
    plan = service.plan_trip(
        destination=payload.destination,
        days=payload.days,
        bankroll=payload.bankroll,
    )
    return plan.__dict__
