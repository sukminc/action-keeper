from dataclasses import dataclass
from typing import List


@dataclass
class TripPlan:
    destination: str
    days: int
    total_budget: float
    daily_budget: float
    affiliate_offers: List[dict]


class TripPlannerService:
    def plan_trip(self, *, destination: str, days: int, bankroll: float) -> TripPlan:
        buffer = bankroll * 0.1
        total_budget = bankroll - buffer
        daily_budget = round(total_budget / max(days, 1), 2)
        affiliate_offers = [
            {
                "partner": "Stacked Hotels",
                "url": "https://example.com/stacked-hotels",
                "discount_code": "ACTION10",
            },
            {
                "partner": "Flight Rollup",
                "url": "https://example.com/flight-rollup",
                "discount_code": "ACTIONSKY",
            },
        ]
        return TripPlan(
            destination=destination,
            days=days,
            total_budget=round(total_budget, 2),
            daily_budget=daily_budget,
            affiliate_offers=affiliate_offers,
        )
