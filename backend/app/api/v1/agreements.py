from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.agreements_repo import AgreementsRepo
from app.repositories.events_repo import EventsRepo
from app.schemas.agreement import AgreementCreate, AgreementRead
from app.services.agreements_service import AgreementsService

router = APIRouter(prefix="/agreements", tags=["agreements"])


@router.post("", response_model=AgreementRead, status_code=201)
def create_agreement(
    data: AgreementCreate,
    db: Session = Depends(get_db)
):
    """Create new agreement with hash."""
    agreements_repo = AgreementsRepo(db)
    events_repo = EventsRepo(db)
    service = AgreementsService(agreements_repo, events_repo)
    agreement = service.create_agreement(data)
    return agreement


@router.get("/{agreement_id}", response_model=AgreementRead)
def get_agreement(
    agreement_id: str,
    db: Session = Depends(get_db),
) -> AgreementRead:
    svc = AgreementsService(db)
    agreement = svc.get_by_id(agreement_id)
    if agreement is None:
        raise HTTPException(status_code=404, detail="Agreement not found")
    return AgreementRead.model_validate(agreement)


@router.get("", response_model=list[AgreementRead])
def list_agreements(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> list[AgreementRead]:
    svc = AgreementsService(db)
    items = svc.list(limit=limit, offset=offset)
    return [AgreementRead.model_validate(a) for a in items]
