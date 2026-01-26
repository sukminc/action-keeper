from __future__ import annotations

from typing import List, Optional

from sqlalchemy.orm import Session

from app.db.models.agreement import Agreement
from app.repositories.agreements_repo import AgreementsRepo
from app.schemas.agreement import AgreementCreate


class AgreementsService:
    def __init__(self, session: Session):
        self.repo = AgreementsRepo(session)

    def create(self, data: AgreementCreate) -> Agreement:
        return self.repo.create(data)

    def get_by_id(self, agreement_id: str) -> Optional[Agreement]:
        return self.repo.get_by_id(agreement_id)

    def list(self, limit: int = 50, offset: int = 0) -> List[Agreement]:
        return self.repo.list(limit=limit, offset=offset)
