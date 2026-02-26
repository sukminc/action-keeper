from datetime import date, datetime
from typing import Any, List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.agreement import Agreement
from app.schemas.agreement import AgreementCreate


class AgreementsRepo:
    def __init__(self, session: Session):
        self.session = session

    def _dollars_to_cents(self, value: Any) -> Optional[int]:
        if value in (None, ""):
            return None
        try:
            return int(round(float(value) * 100))
        except (TypeError, ValueError):
            return None

    def _parse_float(self, value: Any) -> Optional[float]:
        if value in (None, ""):
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    def _parse_int(self, value: Any) -> Optional[int]:
        if value in (None, ""):
            return None
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    def _parse_date(self, value: Any) -> Optional[date]:
        if not value:
            return None
        if isinstance(value, date):
            return value
        try:
            return date.fromisoformat(str(value))
        except ValueError:
            return None

    def create(self, data: AgreementCreate) -> Agreement:
        stake_percent = data.stake_percent
        if stake_percent is None:
            stake_percent = self._parse_float(data.terms.get("stake_pct"))
        buy_in_cents = data.buy_in_amount_cents
        if buy_in_cents is None:
            buy_in_cents = self._dollars_to_cents(data.terms.get("buy_in_amount"))
        bullet_cap = data.bullet_cap
        if bullet_cap is None:
            bullet_cap = self._parse_int(data.terms.get("bullet_cap"))
        payout_basis = data.payout_basis or data.terms.get("payout_basis") or "gross_payout"
        event_date = data.event_date or self._parse_date(data.terms.get("event_date"))
        due_date = data.due_date or self._parse_date(data.terms.get("due_date"))
        party_a_label = data.party_a_label or data.terms.get("party_a_label")
        party_b_label = data.party_b_label or data.terms.get("party_b_label")
        funds_logged_at = data.funds_logged_at
        if not funds_logged_at:
            funds_logged = data.terms.get("funds_received_at")
            if funds_logged:
                try:
                    funds_logged_at = datetime.fromisoformat(str(funds_logged))
                except ValueError:
                    funds_logged_at = None
        negotiation_state = "draft"
        if data.negotiation_action == "counter":
            negotiation_state = "countered"
        elif data.negotiation_action == "accepted":
            negotiation_state = "awaiting_confirmation"

        pending_terms = data.terms if negotiation_state == "countered" else None

        agreement = Agreement(
            agreement_type=data.agreement_type or "poker_staking",
            terms_version=data.terms_version,
            terms=data.terms,
            status="draft",
            payment_id=data.payment_id,
            negotiation_state=negotiation_state,
            pending_terms=pending_terms,
            last_proposed_by=data.proposer_label,
            payout_basis=payout_basis,
            stake_percent=stake_percent,
            buy_in_amount_cents=buy_in_cents,
            bullet_cap=bullet_cap,
            event_date=event_date,
            due_date=due_date,
            party_a_label=party_a_label,
            party_b_label=party_b_label,
            funds_logged_at=funds_logged_at,
        )
        self.session.add(agreement)
        self.session.commit()
        self.session.refresh(agreement)
        return agreement

    def get_by_id(self, agreement_id: str) -> Optional[Agreement]:
        stmt = select(Agreement).where(Agreement.id == agreement_id)
        return self.session.execute(stmt).scalars().first()

    def list(self, limit: int = 50, offset: int = 0) -> List[Agreement]:
        stmt = select(Agreement).offset(offset).limit(limit)
        return list(self.session.execute(stmt).scalars().all())

    def get_by_hash(self, hash_value: str) -> Optional[Agreement]:
        """
        Retrieve agreement by hash value.
        """
        from app.db.models.agreement import Agreement
        return self.session.query(Agreement).filter(
            Agreement.hash == hash_value
        ).first()

    def update(self, agreement: Agreement) -> Agreement:
        self.session.add(agreement)
        self.session.commit()
        self.session.refresh(agreement)
        return agreement
