from sqlalchemy.orm import Session

from app.db.models.artifact import AgreementArtifact


class AgreementArtifactsRepo:
    def __init__(self, session: Session):
        self.session = session

    def create(self, *, agreement_id: str, file_path: str, verification_url: str, hash_snapshot: str) -> AgreementArtifact:
        artifact = AgreementArtifact(
            agreement_id=agreement_id,
            file_path=file_path,
            verification_url=verification_url,
            hash_snapshot=hash_snapshot,
        )
        self.session.add(artifact)
        self.session.commit()
        self.session.refresh(artifact)
        return artifact

    def get_by_agreement(self, agreement_id: str) -> AgreementArtifact | None:
        return (
            self.session.query(AgreementArtifact)
            .filter(AgreementArtifact.agreement_id == agreement_id)
            .order_by(AgreementArtifact.created_at.desc())
            .first()
        )
