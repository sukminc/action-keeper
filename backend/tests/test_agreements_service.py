from app.repositories.agreements_repo import AgreementsRepo
from app.repositories.events_repo import EventsRepo
from app.schemas.agreement import AgreementCreate


def test_create_agreement_service_creates_event(db_session):
    # arrange
    agreements = AgreementsRepo(db_session)
    events = EventsRepo(db_session)

    data = AgreementCreate(
        agreement_type=None,  # service should apply default
        terms_version="v1",
        terms={"a": 1},
    )

    # act
    created = agreements.create(data)

    # service layer behavior we'll implement later:
    # events.append(
    #     agreement_id=created.id,
    #     event_type="agreement_created",
    #     payload={},
    # )

    # assert: repo-only behavior (no events yet)
    rows = events.list_for_agreement(created.id)
    assert rows == []
