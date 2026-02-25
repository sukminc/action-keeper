from app.schemas.agreement import AgreementCreate
from app.repositories.agreements_repo import AgreementsRepo
from app.repositories.events_repo import EventsRepo


def test_append_event_creates_row(db_session):
    agreements = AgreementsRepo(db_session)
    events = EventsRepo(db_session)

    agreement = agreements.create(
        AgreementCreate(
            terms_version="v1_poker",
            terms={"buy_in": 1000},
            agreement_type=None,
            payment_id="test-payment-events")
    )

    evt = events.append(
        agreement_id=agreement.id,
        event_type="CREATED",
        payload={"source": "unit_test"},
    )

    assert evt.id is not None
    assert evt.agreement_id == agreement.id
    assert evt.event_type == "CREATED"
    assert evt.payload["source"] == "unit_test"


def test_list_events_for_agreement(db_session):
    agreements = AgreementsRepo(db_session)
    events = EventsRepo(db_session)

    agreement = agreements.create(
        AgreementCreate(
            terms_version="v1_poker",
            terms={"buy_in": 1000},
            agreement_type=None,
            payment_id="test-payment-events-2")
    )

    events.append(agreement.id, "CREATED", {"n": 1})
    events.append(agreement.id, "UPDATED", {"n": 2})

    rows = events.list_for_agreement(agreement.id)
    assert [r.event_type for r in rows] == ["CREATED", "UPDATED"]
