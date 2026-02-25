from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.agreement import Agreement
from app.schemas.agreement import AgreementCreate


class AgreementsRepo:
    def __init__(self, session: Session):
        self.session = session

    def create(self, data: AgreementCreate) -> Agreement:
        agreement = Agreement(
            agreement_type=data.agreement_type or "poker_staking",
            terms_version=data.terms_version,
            terms=data.terms,
            status="draft",
            payment_id=data.payment_id,
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
