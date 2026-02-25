from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.agreements_repo import AgreementsRepo
from app.repositories.events_repo import EventsRepo
from app.services.agreements_service import AgreementsService

router = APIRouter(prefix="/verify", tags=["verification"])


def _service(db: Session) -> AgreementsService:
    return AgreementsService(AgreementsRepo(db), EventsRepo(db))


def _agreement_summary(service: AgreementsService, agreement_id: str) -> Optional[dict]:
    agreement = service.get_by_id(agreement_id)
    if not agreement:
        return None
    created_at = agreement.created_at.isoformat() if agreement.created_at else None
    return {
        "agreement_type": agreement.agreement_type,
        "created_at": created_at,
        "status": agreement.status,
    }


class VerificationResponse(BaseModel):
    """Response schema for hash verification."""

    valid: bool
    agreement_id: str
    stored_hash: Optional[str] = None
    provided_hash: str
    hash_version: Optional[str] = None
    verified_at: str
    agreement_summary: Optional[dict] = None


class VerificationRequest(BaseModel):
    """Request schema for hash verification (POST)."""

    agreement_id: str
    hash: str


@router.get("", response_model=VerificationResponse)
def verify_agreement_get(
    id: str = Query(..., description="Agreement UUID"),
    hash: str = Query(..., description="SHA-256 hash to verify"),
    db: Session = Depends(get_db),
):
    """
    Verify agreement integrity via hash comparison (GET method).
    Public endpoint - no authentication required.
    """
    service = _service(db)
    try:
        result = service.verify_agreement(
            agreement_id=id,
            provided_hash=hash,
        )
        summary = _agreement_summary(service, id)
        if summary:
            result["agreement_summary"] = summary
        return VerificationResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.post("", response_model=VerificationResponse)
def verify_agreement_post(
    request: VerificationRequest,
    db: Session = Depends(get_db),
):
    """
    Verify agreement integrity via hash comparison (POST method).
    """
    service = _service(db)
    try:
        result = service.verify_agreement(
            agreement_id=request.agreement_id,
            provided_hash=request.hash,
        )
        summary = _agreement_summary(service, request.agreement_id)
        if summary:
            result["agreement_summary"] = summary
        return VerificationResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e)) from e


@router.get("/by-hash/{hash_value}")
def lookup_by_hash(
    hash_value: str,
    db: Session = Depends(get_db),
):
    """
    Look up agreement by hash value alone.
    """
    service = _service(db)
    agreement = service.get_by_hash(hash_value)
    if not agreement:
        raise HTTPException(
            status_code=404,
            detail="No agreement found with this hash",
        )
    created_at = agreement.created_at.isoformat() if agreement.created_at else None
    return {
        "found": True,
        "agreement_id": str(agreement.id),
        "hash": agreement.hash,
        "hash_version": agreement.hash_version,
        "agreement_type": agreement.agreement_type,
        "status": agreement.status,
        "created_at": created_at,
    }
