def _paid_payment(client):
    checkout = client.post(
        "/api/v1/payments/checkout",
        json={"amount_cents": 5000, "currency": "usd"},
    )
    payment = checkout.json()
    client.post(
        "/api/v1/payments/webhook",
        headers={"X-Webhook-Secret": "test-secret"},
        json={"payment_id": payment["payment_id"], "event": "checkout.session.completed"},
    )
    return payment["payment_id"]


def test_negotiation_counter_and_accept(client):
    payment_id = _paid_payment(client)
    
    # 1. Create initial proposal
    payload = {
        "agreement_type": "poker_staking",
        "terms_version": "v1",
        "terms": {"buy_in": 100, "stake_pct": 50},
        "payment_id": payment_id,
        "proposer_label": "Player A",
        "party_a_label": "Player A",
        "party_b_label": "Backer B",
    }
    r = client.post("/api/v1/agreements", json=payload)
    assert r.status_code == 201
    agreement = r.json()
    agreement_id = agreement["id"]
    assert agreement["negotiation_state"] == "draft"

    # 2. Propose a counter
    counter_payload = {
        "proposer_label": "Backer B",
        "terms": {"buy_in": 100, "stake_pct": 40},
        "counter_notes": "I want 40% instead of 50%.",
    }
    r = client.post(f"/api/v1/agreements/{agreement_id}/counter", json=counter_payload)
    assert r.status_code == 200
    countered = r.json()
    assert countered["negotiation_state"] == "countered"
    assert countered["pending_terms"]["stake_pct"] == 40
    assert countered["last_proposed_by"] == "Backer B"
    # Verify structured fields were updated
    assert countered["stake_percent"] == 40.0

    # 3. First acceptance moves to awaiting_confirmation
    accept_payload = {
        "accepter_label": "Player A",
    }
    r = client.post(f"/api/v1/agreements/{agreement_id}/accept", json=accept_payload)
    assert r.status_code == 200
    first_accept = r.json()
    assert first_accept["negotiation_state"] == "awaiting_confirmation"
    assert first_accept["status"] == "draft"
    assert first_accept["terms"]["stake_pct"] == 40
    assert first_accept["party_a_confirmed_at"] is not None

    # 4. Second acceptance finalizes the agreement
    r = client.post(
        f"/api/v1/agreements/{agreement_id}/accept",
        json={"accepter_label": "Backer B"},
    )
    assert r.status_code == 200
    accepted = r.json()
    assert accepted["negotiation_state"] == "accepted"
    assert accepted["status"] == "active"
    assert accepted["party_b_confirmed_at"] is not None
    assert accepted["hash"] != agreement["hash"]

    # 5. Check events
    r = client.get(f"/api/v1/agreements/{agreement_id}/events")
    events = r.json()
    event_types = [e["event_type"] for e in events]
    assert "negotiation_countered" in event_types
    assert "agreement_accepted" in event_types


def test_negotiation_decline(client):
    payment_id = _paid_payment(client)
    payload = {
        "agreement_type": "poker_staking",
        "terms_version": "v1",
        "terms": {"buy_in": 100, "stake_pct": 50},
        "payment_id": payment_id,
        "proposer_label": "Player A",
        "party_a_label": "Player A",
        "party_b_label": "Backer B",
    }
    r = client.post("/api/v1/agreements", json=payload)
    assert r.status_code == 201
    agreement_id = r.json()["id"]

    decline_resp = client.post(
        f"/api/v1/agreements/{agreement_id}/decline",
        json={"decliner_label": "Backer B", "reason": "Too much markup"},
    )
    assert decline_resp.status_code == 200
    declined = decline_resp.json()
    assert declined["negotiation_state"] == "declined"
    assert declined["status"] == "cancelled"

    accept_after_decline = client.post(
        f"/api/v1/agreements/{agreement_id}/accept",
        json={"accepter_label": "Player A"},
    )
    assert accept_after_decline.status_code == 404
