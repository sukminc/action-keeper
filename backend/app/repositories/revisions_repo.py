from typing import Dict, Optional

from sqlalchemy.orm import Session

from app.db.models.agreement_revision import AgreementRevision


class AgreementRevisionsRepo:
    def __init__(self, session: Session):
        self.session = session

    def append(
        self,
        *,
        agreement_id: str,
        status: str,
        terms_snapshot: Dict,
        proposer_label: Optional[str] = None,
    ) -> AgreementRevision:
        revision = AgreementRevision(
            agreement_id=agreement_id,
            status=status,
            proposer_label=proposer_label,
            terms=terms_snapshot,
        )
        self.session.add(revision)
        self.session.commit()
        self.session.refresh(revision)
        return revision
