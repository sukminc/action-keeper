from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from app.db.session import get_db
from app.repositories.agreements_repo import AgreementsRepo
from app.repositories.events_repo import EventsRepo
from app.services.agreements_service import AgreementsService


router = APIRouter(prefix="/api/v1", tags=["verification"])


class VerificationResponse(BaseModel):
    """Response schema for hash verification."""
    valid: bool
    agreement_id: str
    stored_hash: str
    provided_hash: str
    hash_version: str
    verified_at: str
    agreement_summary: Optional[dict] = None


class VerificationRequest(BaseModel):
    """Request schema for hash verification (POST)."""
    agreement_id: str
    hash: str


@router.get("/verify", response_model=VerificationResponse)
def verify_agreement_get(
    id: str = Query(..., description="Agreement UUID"),
    hash: str = Query(..., description="SHA-256 hash to verify"),
    db: Session = Depends(get_db)
):
    """
    Verify agreement integrity via hash comparison (GET method).
    Public endpoint - no authentication required.
    """
    agreements_repo = AgreementsRepo(db)
    events_repo = EventsRepo(db)
    service = AgreementsService(agreements_repo, events_repo)
    try:
        result = service.verify_agreement(
            agreement_id=id,
            provided_hash=hash
        )
        # Include minimal agreement summary if valid
        if result['valid']:
            agreement = agreements_repo.get_by_id(id)
            if agreement:
                result['agreement_summary'] = {
                    'agreement_type': agreement.agreement_type,
                    'created_at': agreement.created_at.isoformat()
                    if agreement.created_at else None,
                    'status': agreement.status
                }
        return VerificationResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/verify", response_model=VerificationResponse)
def verify_agreement_post(
    request: VerificationRequest,
    db: Session = Depends(get_db)
):
    """
    Verify agreement integrity via hash comparison (POST method).
    """
    agreements_repo = AgreementsRepo(db)
    events_repo = EventsRepo(db)
    service = AgreementsService(agreements_repo, events_repo)
    try:
        result = service.verify_agreement(
            agreement_id=request.agreement_id,
            provided_hash=request.hash
        )
        if result['valid']:
            agreement = agreements_repo.get_by_id(request.agreement_id)
            if agreement:
                result['agreement_summary'] = {
                    'agreement_type': agreement.agreement_type,
                    'created_at': agreement.created_at.isoformat()
                    if agreement.created_at else None,
                    'status': agreement.status
                }
        return VerificationResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/verify/by-hash/{hash_value}")
def lookup_by_hash(
    hash_value: str,
    db: Session = Depends(get_db)
):
    """
    Look up agreement by hash value alone.
    """
    agreements_repo = AgreementsRepo(db)
    events_repo = EventsRepo(db)
    service = AgreementsService(agreements_repo, events_repo)
    agreement = service.get_by_hash(hash_value)
    if not agreement:
        raise HTTPException(
            status_code=404,
            detail="No agreement found with this hash"
        )
    return {
        'found': True,
        'agreement_id': str(agreement.id),
        'hash': agreement.hash,
        'hash_version': agreement.hash_version,
        'agreement_type': agreement.agreement_type,
        'status': agreement.status,
        'created_at': agreement.created_at.isoformat()
        if agreement.created_at else None
    }
