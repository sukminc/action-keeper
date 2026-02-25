from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.db.models.payment import Payment


class PaymentsRepo:
    def __init__(self, session: Session):
        self.session = session

    def create(
        self,
        *,
        amount_cents: int,
        currency: str,
        stripe_session_id: str,
        metadata: Optional[dict] = None,
    ) -> Payment:
        payment = Payment(
            amount_cents=amount_cents,
            currency=currency,
            stripe_session_id=stripe_session_id,
            metadata_json=metadata or {},
        )
        self.session.add(payment)
        self.session.commit()
        self.session.refresh(payment)
        return payment

    def get(self, payment_id: str) -> Payment | None:
        return self.session.get(Payment, payment_id)

    def set_status(self, payment_id: str, status: str, *, paid_at: datetime | None = None) -> Payment | None:
        payment = self.get(payment_id)
        if not payment:
            return None
        payment.status = status
        if status == "paid":
            payment.paid_at = paid_at or datetime.now(timezone.utc)
        self.session.commit()
        self.session.refresh(payment)
        return payment

    def link_to_agreement(self, payment_id: str, agreement_id: str) -> None:
        payment = self.get(payment_id)
        if not payment:
            return
        payment.agreement_id = agreement_id
        self.session.commit()
