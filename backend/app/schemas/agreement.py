from datetime import date, datetime
from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class AgreementCreate(BaseModel):
    agreement_type: Optional[str] = Field(default=None)
    terms_version: str
    terms: Dict[str, Any]
    payment_id: str
    proposer_label: Optional[str] = None
    negotiation_action: Literal["proposed", "counter", "accepted", "draft"] = "proposed"
    counter_notes: Optional[str] = None
    stake_percent: Optional[float] = None
    buy_in_amount_cents: Optional[int] = None
    payout_basis: Optional[str] = "gross_payout"
    bullet_cap: Optional[int] = None
    event_date: Optional[date] = None
    due_date: Optional[date] = None
    party_a_label: Optional[str] = None
    party_b_label: Optional[str] = None
    funds_logged_at: Optional[datetime] = None


class AgreementCounter(BaseModel):
    proposer_label: str
    terms: Dict[str, Any]
    counter_notes: Optional[str] = None


class AgreementAccept(BaseModel):
    accepter_label: str


class AgreementDecline(BaseModel):
    decliner_label: str
    reason: Optional[str] = None


class AgreementArtifactRead(BaseModel):
    verification_url: str
    hash_snapshot: str
    file_path: Optional[str] = None


class AgreementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    agreement_type: str
    terms_version: str
    terms: Dict[str, Any]
    status: str
    negotiation_state: str
    pending_terms: Optional[Dict[str, Any]] = None
    last_proposed_by: Optional[str] = None
    payment_id: Optional[str] = None
    hash: Optional[str] = None
    hash_version: Optional[str] = None
    payout_basis: Optional[str] = None
    stake_percent: Optional[float] = None
    buy_in_amount_cents: Optional[int] = None
    bullet_cap: Optional[int] = None
    event_date: Optional[date] = None
    due_date: Optional[date] = None
    party_a_label: Optional[str] = None
    party_b_label: Optional[str] = None
    party_a_confirmed_at: Optional[datetime] = None
    party_b_confirmed_at: Optional[datetime] = None
    funds_logged_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
