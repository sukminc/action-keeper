from __future__ import annotations

from fastapi import Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.agreements_repo import AgreementsRepo
from app.repositories.artifacts_repo import AgreementArtifactsRepo
from app.repositories.events_repo import EventsRepo
from app.repositories.payments_repo import PaymentsRepo
from app.repositories.revisions_repo import AgreementRevisionsRepo
from app.services.agreements_service import AgreementsService
from app.services.payments_service import PaymentsService


def get_agreements_service(db: Session = Depends(get_db)) -> AgreementsService:
    return AgreementsService(
        AgreementsRepo(db),
        EventsRepo(db),
        payments_repo=PaymentsRepo(db),
        artifacts_repo=AgreementArtifactsRepo(db),
        revisions_repo=AgreementRevisionsRepo(db),
    )


def get_payments_service(db: Session = Depends(get_db)) -> PaymentsService:
    return PaymentsService(PaymentsRepo(db))


def get_events_repo(db: Session = Depends(get_db)) -> EventsRepo:
    return EventsRepo(db)
