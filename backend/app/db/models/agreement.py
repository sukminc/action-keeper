import uuid
from sqlalchemy import DateTime, JSON, String, func, Index
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

    # 🆕 Tamper-evident receipt (이 두 줄 추가)
    hash: Mapped[str | None] = mapped_column(
        String(64), nullable=True, index=True
        )
    hash_version: Mapped[str | None] = mapped_column(
        String(10),
        nullable=True,
        default='v1'
        )

    created_at: Mapped[str] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    def get_hashable_data(self):
        """Extract fields for hash computation."""
        return {
            'agreement_type': self.agreement_type,
            'terms_version': self.terms_version,
            'terms': self.terms,
            'status': self.status,
        }
