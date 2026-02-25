import os
import uuid
from datetime import datetime, timezone

from app.repositories.payments_repo import PaymentsRepo


class PaymentsService:
    def __init__(self, payments_repo: PaymentsRepo):
        self.payments_repo = payments_repo

    def create_checkout_session(self, *, amount_cents: int, currency: str, metadata: dict | None = None):
        session_id = f"cs_test_{uuid.uuid4().hex}"
        payment = self.payments_repo.create(
            amount_cents=amount_cents,
            currency=currency,
            stripe_session_id=session_id,
            metadata=metadata,
        )
        checkout_url = f"https://checkout.stripe.com/pay/{session_id}"
        return payment, checkout_url

    def handle_webhook(self, *, payment_id: str, event: str):
        event = event.lower()
        if event == "checkout.session.completed":
            return self.payments_repo.set_status(payment_id, "paid", paid_at=datetime.now(timezone.utc))
        if event == "payment.failed":
            return self.payments_repo.set_status(payment_id, "failed")
        return None

    def get(self, payment_id: str):
        return self.payments_repo.get(payment_id)
