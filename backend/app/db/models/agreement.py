import uuid
from datetime import date, datetime

from sqlalchemy import JSON, Date, DateTime, Float, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Agreement(Base):
    __tablename__ = "agreements"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )

    agreement_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="poker_staking",
    )
    terms_version: Mapped[str] = mapped_column(String(50), nullable=False)

    # Use a cross-dialect JSON type so SQLite tests can create tables.
    terms: Mapped[dict] = mapped_column(JSON, nullable=False)

    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="draft"
    )
    negotiation_state: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="draft",
    )
    pending_terms: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    last_proposed_by: Mapped[str | None] = mapped_column(String(100), nullable=True)

    payment_id: Mapped[str | None] = mapped_column(
        String(36),
        nullable=True,
        index=True,
    )

    hash: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
        index=True,
    )
    hash_version: Mapped[str | None] = mapped_column(
        String(10),
        nullable=True,
        default="v1"
    )

    payout_basis: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="gross_payout",
    )
    stake_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    buy_in_amount_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bullet_cap: Mapped[int | None] = mapped_column(Integer, nullable=True)
    event_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    party_a_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    party_b_label: Mapped[str | None] = mapped_column(String(100), nullable=True)
    party_a_confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    party_b_confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    funds_logged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    def get_hashable_data(self):
        """Extract fields for hash computation."""
        return {
            "agreement_type": self.agreement_type,
            "terms_version": self.terms_version,
            "terms": self.terms,
            "status": self.status,
            "payout_basis": self.payout_basis,
            "stake_percent": self.stake_percent,
            "buy_in_amount_cents": self.buy_in_amount_cents,
            "bullet_cap": self.bullet_cap,
            "event_date": self.event_date.isoformat() if self.event_date else None,
            "due_date": self.due_date.isoformat() if self.due_date else None,
        }
