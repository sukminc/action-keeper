from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.agreements_repo import AgreementsRepo
from app.repositories.artifacts_repo import AgreementArtifactsRepo
from app.repositories.events_repo import EventsRepo
from app.repositories.payments_repo import PaymentsRepo
from app.schemas.agreement import AgreementRead, AgreementCreate
from app.schemas.event import EventRead
from app.services.agreements_service import AgreementsService
from app.utils.hash_utils import HASH_VERSION, generate_verification_url

router = APIRouter(prefix="/agreements", tags=["agreements"])


def _service(db: Session) -> AgreementsService:
    return AgreementsService(
        AgreementsRepo(db),
        EventsRepo(db),
        payments_repo=PaymentsRepo(db),
        artifacts_repo=AgreementArtifactsRepo(db),
    )


def _verification_base_url() -> str:
    base = os.getenv("VERIFY_BASE_URL") or os.getenv("API_BASE_URL") or "http://localhost:8000"
    return base.rstrip("/")


def _serialize_agreement(service: AgreementsService, agreement: Any) -> AgreementRead:
    qr_payload = None
    artifact_payload = None
    if getattr(agreement, "hash", None):
        verification_url = generate_verification_url(
            str(agreement.id),
            agreement.hash,
            _verification_base_url(),
        )
        qr_payload = {
            "version": agreement.hash_version or HASH_VERSION,
            "hash": agreement.hash,
            "agreement_id": str(agreement.id),
            "verification_url": verification_url,
        }
        artifact = service.get_artifact(str(agreement.id))
        if artifact:
            artifact_payload = {
                "verification_url": artifact.verification_url,
                "hash_snapshot": artifact.hash_snapshot,
                "file_path": artifact.file_path,
            }

    return AgreementRead.model_validate(
        {
            "id": str(agreement.id),
            "agreement_type": agreement.agreement_type,
            "terms_version": agreement.terms_version,
            "terms": agreement.terms,
            "status": agreement.status,
            "payment_id": agreement.payment_id,
            "hash": agreement.hash,
            "hash_version": agreement.hash_version,
            "created_at": agreement.created_at,
            "qr_payload": qr_payload,
            "artifact": artifact_payload,
        }
    )


@router.post("", response_model=AgreementRead, status_code=201)
def create_agreement(
    data: AgreementCreate,
    db: Session = Depends(get_db),
):
    service = _service(db)
    try:
        agreement = service.create_agreement(data)
    except ValueError as exc:
        raise HTTPException(status_code=402, detail=str(exc))
    return _serialize_agreement(service, agreement)


@router.get("/{agreement_id}", response_model=AgreementRead)
def get_agreement(
    agreement_id: str,
    db: Session = Depends(get_db),
) -> AgreementRead:
    service = _service(db)
    agreement = service.get_by_id(agreement_id)
    if agreement is None:
        raise HTTPException(status_code=404, detail="Agreement not found")
    return _serialize_agreement(service, agreement)


@router.get("", response_model=list[AgreementRead])
def list_agreements(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
) -> list[AgreementRead]:
    service = _service(db)
    items = service.list(limit=limit, offset=offset)
    return [_serialize_agreement(service, item) for item in items]


@router.get("/{agreement_id}/events", response_model=list[EventRead])
def list_agreement_events(
    agreement_id: str,
    db: Session = Depends(get_db),
) -> list[EventRead]:
    service = _service(db)
    agreement = service.get_by_id(agreement_id)
    if not agreement:
        raise HTTPException(status_code=404, detail="Agreement not found")
    events = EventsRepo(db).list_for_agreement(agreement_id)
    return [
        EventRead(
            id=str(evt.id),
            agreement_id=str(evt.agreement_id),
            event_type=evt.event_type,
            payload=evt.payload,
            created_at=evt.created_at,
        )
        for evt in events
    ]


@router.get("/{agreement_id}/artifact")
def download_agreement_artifact(
    agreement_id: str,
    db: Session = Depends(get_db),
):
    service = _service(db)
    artifact = service.get_artifact(agreement_id)
    if not artifact:
        raise HTTPException(status_code=404, detail="Artifact not found")
    file_path = Path(artifact.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Artifact missing on disk")
    return FileResponse(
        path=file_path,
        media_type="application/pdf",
        filename=file_path.name,
    )
