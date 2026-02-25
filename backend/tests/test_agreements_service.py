import pytest

from app.repositories.agreements_repo import AgreementsRepo
from app.repositories.artifacts_repo import AgreementArtifactsRepo
from app.repositories.events_repo import EventsRepo
from app.repositories.payments_repo import PaymentsRepo
from app.schemas.agreement import AgreementCreate
from app.services.agreements_service import AgreementsService
from app.utils.hash_utils import HASH_VERSION


def _paid_payment(payments_repo: PaymentsRepo):
    payment = payments_repo.create(
        amount_cents=5000,
        currency="usd",
        stripe_session_id="cs_test_service",
        metadata={"purpose": "test"},
    )
    payments_repo.set_status(payment.id, "paid")
    return payment


def test_create_agreement_service_generates_hash_event_and_artifact(db_session):
    agreements = AgreementsRepo(db_session)
    events = EventsRepo(db_session)
    payments = PaymentsRepo(db_session)
    artifacts = AgreementArtifactsRepo(db_session)
    service = AgreementsService(agreements, events, payments_repo=payments, artifacts_repo=artifacts)

    payment = _paid_payment(payments)
    data = AgreementCreate(
        agreement_type=None,
        terms_version="v1",
        terms={"a": 1},
        payment_id=payment.id,
    )

    created = service.create_agreement(data)

    assert created.hash is not None
    assert len(created.hash) == 64
    assert created.hash_version == HASH_VERSION

    rows = events.list_for_agreement(created.id)
    assert len(rows) == 1
    assert rows[0].event_type == "agreement_created"
    assert rows[0].payload["hash"] == created.hash

    artifact = artifacts.get_by_agreement(created.id)
    assert artifact is not None


def test_create_agreement_requires_paid_payment(db_session):
    agreements = AgreementsRepo(db_session)
    events = EventsRepo(db_session)
    payments = PaymentsRepo(db_session)
    service = AgreementsService(agreements, events, payments_repo=payments)

    payment = payments.create(
        amount_cents=1000,
        currency="usd",
        stripe_session_id="cs_pending",
    )

    data = AgreementCreate(
        agreement_type=None,
        terms_version="v1",
        terms={"a": 1},
        payment_id=payment.id,
    )

    with pytest.raises(ValueError):
        service.create_agreement(data)
