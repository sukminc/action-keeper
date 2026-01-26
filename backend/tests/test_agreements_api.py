def test_create_and_get_agreement_happy_path(client):
    payload = {
        "agreement_type": "poker_staking",
        "terms_version": "v1",
        "terms": {"buy_in": 100, "markup": 1.0},
    }

    r = client.post("/api/v1/agreements", json=payload)
    assert r.status_code == 201
    created = r.json()
    assert created["agreement_type"] == "poker_staking"
    assert created["status"] == "draft"

    agreement_id = created["id"]

    r2 = client.get(f"/api/v1/agreements/{agreement_id}")
    assert r2.status_code == 200
    fetched = r2.json()
    assert fetched["id"] == agreement_id
