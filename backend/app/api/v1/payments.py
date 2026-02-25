from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, status

from app.core.config import settings
from app.core.container import get_payments_service
from app.schemas.payment import (
    PaymentCheckoutRequest,
    PaymentCheckoutResponse,
    PaymentRead,
    PaymentWebhookEvent,
)
from app.services.payments_service import PaymentsService

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/checkout", response_model=PaymentCheckoutResponse, status_code=201)
def create_checkout_session(
    payload: PaymentCheckoutRequest,
    service: PaymentsService = Depends(get_payments_service),
):
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
    service: PaymentsService = Depends(get_payments_service),
    x_webhook_secret: str | None = Header(default=None),
):
    secret = settings.stripe_webhook_secret
    if secret and secret != x_webhook_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid webhook signature",
        )
    payment = service.handle_webhook(payment_id=event.payment_id, event=event.event)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found or unsupported event")
    return {"status": payment.status}


@router.get("/{payment_id}", response_model=PaymentRead)
def get_payment(payment_id: str, service: PaymentsService = Depends(get_payments_service)):
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
