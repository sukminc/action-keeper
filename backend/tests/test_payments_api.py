def test_payments_checkout_webhook_and_get(client):
    checkout = client.post(
        "/api/v1/payments/checkout",
        json={"amount_cents": 1200, "currency": "usd"},
    )
    assert checkout.status_code == 201
    data = checkout.json()
    payment_id = data["payment_id"]
    assert data["status"] == "pending"

    bad_webhook = client.post(
        "/api/v1/payments/webhook",
        headers={"X-Webhook-Secret": "wrong"},
        json={"payment_id": payment_id, "event": "checkout.session.completed"},
    )
    assert bad_webhook.status_code == 401

    good_webhook = client.post(
        "/api/v1/payments/webhook",
        headers={"X-Webhook-Secret": "test-secret"},
        json={"payment_id": payment_id, "event": "checkout.session.completed"},
    )
    assert good_webhook.status_code == 200
    assert good_webhook.json()["status"] == "paid"

    get_resp = client.get(f"/api/v1/payments/{payment_id}")
    assert get_resp.status_code == 200
    body = get_resp.json()
    assert body["status"] == "paid"
    assert body["checkout_url"].startswith("https://checkout.stripe.com/pay/")
