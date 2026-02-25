import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.artifacts.pdf_renderer import render_agreement_pdf
from app.core.config import settings
from app.db.models.agreement import Agreement
from app.repositories.agreements_repo import AgreementsRepo
from app.repositories.artifacts_repo import AgreementArtifactsRepo
from app.repositories.events_repo import EventsRepo
from app.repositories.payments_repo import PaymentsRepo
from app.schemas.agreement import AgreementCreate
from app.utils.hash_utils import HASH_VERSION, compute_agreement_hash, generate_verification_url


class AgreementsService:
    """Service layer for agreement operations."""

    def __init__(
        self,
        agreements_repo: AgreementsRepo,
        events_repo: EventsRepo,
        payments_repo: PaymentsRepo | None = None,
        artifacts_repo: AgreementArtifactsRepo | None = None,
    ):
        self.agreements_repo = agreements_repo
        self.events_repo = events_repo
        self.payments_repo = payments_repo
        self.artifacts_repo = artifacts_repo

    def _ensure_payment_ready(self, payment_id: Optional[str]) -> None:
        if not payment_id:
            raise ValueError("payment_id is required for agreement creation")
        if not self.payments_repo:
            raise ValueError("Payments repository not configured")
        payment = self.payments_repo.get(payment_id)
        if not payment or payment.status != "paid":
            raise ValueError("Payment is required before generating agreement")

    def create_agreement(self, data: AgreementCreate) -> Agreement:
        """
        Create a new agreement with tamper-evident hash and artifact.
        """
        self._ensure_payment_ready(data.payment_id)

        agreement = self.agreements_repo.create(data)

        hashable_data = agreement.get_hashable_data()
        agreement.hash = compute_agreement_hash(hashable_data)
        agreement.hash_version = HASH_VERSION

        self.agreements_repo.session.commit()
        self.agreements_repo.session.refresh(agreement)

        if self.payments_repo:
            self.payments_repo.link_to_agreement(data.payment_id, str(agreement.id))

        if self.artifacts_repo:
            self._create_artifact(agreement)

        self.events_repo.append(
            agreement_id=agreement.id,
            event_type="agreement_created",
            payload={
                "hash": agreement.hash,
                "hash_version": agreement.hash_version,
            },
        )

        return agreement

    def _create_artifact(self, agreement: Agreement) -> None:
        verify_base = settings.verify_base_url.rstrip("/")
        verification_url = generate_verification_url(
            str(agreement.id),
            agreement.hash or "",
            verify_base,
        )
        artifacts_dir = settings.artifacts_dir
        output_dir = os.path.join(artifacts_dir, "agreements")
        file_path = render_agreement_pdf(
            agreement_id=str(agreement.id),
            agreement_type=agreement.agreement_type,
            status=agreement.status,
            terms=agreement.terms,
            hash_value=agreement.hash or "",
            verification_url=verification_url,
            output_dir=output_dir,
        )
        if self.artifacts_repo:
            self.artifacts_repo.create(
                agreement_id=str(agreement.id),
                file_path=str(file_path),
                verification_url=verification_url,
                hash_snapshot=agreement.hash or "",
            )

    def verify_agreement(
        self,
        agreement_id: str,
        provided_hash: str,
    ) -> Dict[str, Any]:
        agreement = self.agreements_repo.get_by_id(agreement_id)
        if not agreement:
            raise ValueError(f"Agreement {agreement_id} not found")
        is_valid = agreement.hash == provided_hash
        verified_at = datetime.now(timezone.utc).isoformat()
        result = {
            "valid": is_valid,
            "agreement_id": str(agreement.id),
            "stored_hash": agreement.hash,
            "provided_hash": provided_hash,
            "hash_version": agreement.hash_version,
            "verified_at": verified_at,
        }
        self.events_repo.append(
            agreement_id=str(agreement.id),
            event_type="hash_verified",
            payload={"valid": is_valid, "provided_hash": provided_hash},
        )
        return result

    def get_by_hash(self, hash_value: str) -> Optional[Agreement]:
        return self.agreements_repo.get_by_hash(hash_value)

    def get_by_id(self, agreement_id: str) -> Optional[Agreement]:
        return self.agreements_repo.get_by_id(agreement_id)

    def list(self, limit: int = 50, offset: int = 0) -> List[Agreement]:
        return self.agreements_repo.list(limit=limit, offset=offset)

    def get_artifact(self, agreement_id: str):
        if not self.artifacts_repo:
            return None
        return self.artifacts_repo.get_by_agreement(agreement_id)
