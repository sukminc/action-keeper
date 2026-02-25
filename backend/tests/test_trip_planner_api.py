def test_trip_planner_returns_plan(client):
    response = client.post(
        "/api/v1/trip-planner/plan",
        json={"destination": "Las Vegas", "days": 4, "bankroll": 5000},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["destination"] == "Las Vegas"
    assert data["days"] == 4
    assert data["affiliate_offers"]
