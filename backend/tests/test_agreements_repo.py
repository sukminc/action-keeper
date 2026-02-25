from app.schemas.agreement import AgreementCreate
from app.repositories.agreements_repo import AgreementsRepo


def test_create_agreement_persists_defaults(db_session):
    repo = AgreementsRepo(db_session)

    payload = AgreementCreate(
        terms_version="v1_poker",
        terms={"buy_in": 1000, "markup": 1.2, "stake_pct": 10},
        agreement_type=None,
        payment_id="test-payment",
    )
    created = repo.create(payload)

    assert created.id is not None
    assert created.agreement_type == "poker_staking"
    assert created.terms_version == "v1_poker"
    assert created.terms["buy_in"] == 1000
    assert created.status == "draft"


def test_list_agreements_returns_created(db_session):
    repo = AgreementsRepo(db_session)

    a1 = repo.create(
        AgreementCreate(
            terms_version="v1_poker",
            terms={"buy_in": 500},
            agreement_type=None,
            payment_id="test-payment-1")
    )
    a2 = repo.create(
        AgreementCreate(
            terms_version="v1_poker",
            terms={"buy_in": 1000},
            agreement_type="poker_staking",
            payment_id="test-payment-2")
    )

    results = repo.list(limit=10, offset=0)
    ids = {a.id for a in results}

    assert a1.id in ids
    assert a2.id in ids


def test_get_by_id_returns_none_when_missing(db_session):
    repo = AgreementsRepo(db_session)
    assert repo.get_by_id("00000000-0000-0000-0000-000000000000") is None
