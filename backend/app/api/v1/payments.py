from __future__ import annotations

import os

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.repositories.payments_repo import PaymentsRepo
from app.schemas.payment import (
    PaymentCheckoutRequest,
    PaymentCheckoutResponse,
    PaymentRead,
    PaymentWebhookEvent,
)
from app.services.payments_service import PaymentsService

router = APIRouter(prefix="/payments", tags=["payments"])


def _service(db: Session) -> PaymentsService:
    return PaymentsService(PaymentsRepo(db))


@router.post("/checkout", response_model=PaymentCheckoutResponse, status_code=201)
def create_checkout_session(
    payload: PaymentCheckoutRequest,
    db: Session = Depends(get_db),
):
    service = _service(db)
    payment, checkout_url = service.create_checkout_session(
        amount_cents=payload.amount_cents,
        currency=payload.currency,
        metadata=payload.metadata,
    )
    return PaymentCheckoutResponse(
        payment_id=payment.id,
        checkout_url=checkout_url,
        status=payment.status,
    )


@router.post("/webhook", status_code=200)
def stripe_webhook(
    event: PaymentWebhookEvent,
    db: Session = Depends(get_db),
    x_webhook_secret: str | None = Header(default=None),
):
    secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    if secret and secret != x_webhook_secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook signature")
    service = _service(db)
    payment = service.handle_webhook(payment_id=event.payment_id, event=event.event)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found or unsupported event")
    return {"status": payment.status}


@router.get("/{payment_id}", response_model=PaymentRead)
def get_payment(payment_id: str, db: Session = Depends(get_db)):
    service = _service(db)
    payment = service.get(payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    checkout_url = f"https://checkout.stripe.com/pay/{payment.stripe_session_id}"
    return PaymentRead(
        id=payment.id,
        status=payment.status,
        amount_cents=payment.amount_cents,
        currency=payment.currency,
        checkout_url=checkout_url,
        agreement_id=payment.agreement_id,
        paid_at=payment.paid_at,
    )
