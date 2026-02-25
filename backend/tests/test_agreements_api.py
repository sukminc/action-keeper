def _paid_payment(client):
    checkout = client.post(
        "/api/v1/payments/checkout",
        json={"amount_cents": 5000, "currency": "usd"},
    )
    payment = checkout.json()
    webhook = client.post(
        "/api/v1/payments/webhook",
        headers={"X-Webhook-Secret": "test-secret"},
        json={"payment_id": payment["payment_id"], "event": "checkout.session.completed"},
    )
    assert webhook.status_code == 200
    return payment["payment_id"]


def test_create_and_get_agreement_happy_path(client):
    payment_id = _paid_payment(client)
    payload = {
        "agreement_type": "poker_staking",
        "terms_version": "v1",
        "terms": {"buy_in": 100, "markup": 1.0},
        "payment_id": payment_id,
    }

    r = client.post("/api/v1/agreements", json=payload)
    assert r.status_code == 201
    created = r.json()
    assert created["agreement_type"] == "poker_staking"
    assert created["status"] == "draft"
    assert created["hash"]
    assert created["qr_payload"]["verification_url"].endswith(
        f"/api/v1/verify?id={created['id']}&hash={created['hash']}"
    )
    assert created["artifact"]["verification_url"].endswith(created["hash"])

    agreement_id = created["id"]

    r2 = client.get(f"/api/v1/agreements/{agreement_id}")
    assert r2.status_code == 200
    fetched = r2.json()
    assert fetched["id"] == agreement_id
    assert fetched["hash"] == created["hash"]

    artifact_resp = client.get(f"/api/v1/agreements/{agreement_id}/artifact")
    assert artifact_resp.status_code == 200
    assert artifact_resp.headers["content-type"] == "application/pdf"


def test_verification_endpoints(client):
    payment_id = _paid_payment(client)
    payload = {
        "terms_version": "v1",
        "terms": {"buy_in": 100},
        "payment_id": payment_id,
    }
    create_resp = client.post("/api/v1/agreements", json=payload)
    agreement = create_resp.json()

    verify_resp = client.get(
        "/api/v1/verify",
        params={"id": agreement["id"], "hash": agreement["hash"]},
    )
    assert verify_resp.status_code == 200
    body = verify_resp.json()
    assert body["valid"] is True
    assert body["agreement_summary"]["agreement_type"] == agreement["agreement_type"]

    verify_post = client.post(
        "/api/v1/verify",
        json={"agreement_id": agreement["id"], "hash": "invalid"},
    )
    assert verify_post.status_code == 200
    assert verify_post.json()["valid"] is False

    lookup_resp = client.get(f"/api/v1/verify/by-hash/{agreement['hash']}")
    assert lookup_resp.status_code == 200
    lookup_body = lookup_resp.json()
    assert lookup_body["found"] is True
    assert lookup_body["agreement_id"] == agreement["id"]
