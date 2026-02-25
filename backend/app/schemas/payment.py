from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class PaymentCheckoutRequest(BaseModel):
    amount_cents: int = Field(gt=0)
    currency: str = Field(default="usd", max_length=10)
    metadata: Optional[Dict[str, Any]] = None


class PaymentCheckoutResponse(BaseModel):
    payment_id: str
    checkout_url: str
    status: str


class PaymentWebhookEvent(BaseModel):
    payment_id: str
    event: str


class PaymentRead(BaseModel):
    id: str
    status: str
    amount_cents: int
    currency: str
    checkout_url: str
    agreement_id: Optional[str] = None
    paid_at: Optional[datetime] = None
