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
from app.repositories.revisions_repo import AgreementRevisionsRepo
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
        revisions_repo: AgreementRevisionsRepo | None = None,
    ):
        self.agreements_repo = agreements_repo
        self.events_repo = events_repo
        self.payments_repo = payments_repo
        self.artifacts_repo = artifacts_repo
        self.revisions_repo = revisions_repo

    def _ensure_payment_ready(self, payment_id: Optional[str]) -> None:
        if not payment_id:
            raise ValueError("payment_id is required for agreement creation")
        if not self.payments_repo:
            raise ValueError("Payments repository not configured")
        payment = self.payments_repo.get(payment_id)
        if not payment or payment.status != "paid":
            raise ValueError("Payment is required before generating agreement")

    def _hydrate_structured_fields(self, data: AgreementCreate) -> None:
        terms = data.terms or {}
        if data.stake_percent is None and "stake_pct" in terms:
            try:
                data.stake_percent = float(terms["stake_pct"])
            except (TypeError, ValueError):
                data.stake_percent = None
        if data.buy_in_amount_cents is None and "buy_in_amount" in terms:
            try:
                data.buy_in_amount_cents = int(round(float(terms["buy_in_amount"]) * 100))
            except (TypeError, ValueError):
                data.buy_in_amount_cents = None
        if data.bullet_cap is None and "bullet_cap" in terms:
            try:
                data.bullet_cap = int(terms["bullet_cap"])
            except (TypeError, ValueError):
                data.bullet_cap = None
        if data.payout_basis in (None, "") and terms.get("payout_basis"):
            data.payout_basis = terms["payout_basis"]
        if data.party_a_label is None and terms.get("party_a_label"):
            data.party_a_label = terms["party_a_label"]
        if data.party_b_label is None and terms.get("party_b_label"):
            data.party_b_label = terms["party_b_label"]
        if data.event_date is None and terms.get("event_date"):
            try:
                data.event_date = datetime.fromisoformat(terms["event_date"]).date()
            except (TypeError, ValueError):
                data.event_date = None
        if data.due_date is None and terms.get("due_date"):
            try:
                data.due_date = datetime.fromisoformat(terms["due_date"]).date()
            except (TypeError, ValueError):
                data.due_date = None
        if data.funds_logged_at is None and terms.get("funds_received_at"):
            try:
                data.funds_logged_at = datetime.fromisoformat(terms["funds_received_at"])
            except (TypeError, ValueError):
                data.funds_logged_at = None

    def create_agreement(self, data: AgreementCreate) -> Agreement:
        """
        Create a new agreement with tamper-evident hash and artifact.
        """
        self._ensure_payment_ready(data.payment_id)
        self._hydrate_structured_fields(data)

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

        if self.revisions_repo:
            self.revisions_repo.append(
                agreement_id=agreement.id,
                status=agreement.negotiation_state,
                terms_snapshot=agreement.terms,
                proposer_label=data.proposer_label,
            )

        event_type = "agreement_created"
        if agreement.negotiation_state == "countered":
            event_type = "negotiation_countered"
        elif agreement.negotiation_state == "awaiting_confirmation":
            event_type = "awaiting_confirmation"

        self.events_repo.append(
            agreement_id=agreement.id,
            event_type=event_type,
            payload={
                "hash": agreement.hash,
                "hash_version": agreement.hash_version,
                "payout_basis": agreement.payout_basis,
                "stake_percent": agreement.stake_percent,
                "buy_in_amount_cents": agreement.buy_in_amount_cents,
                "bullet_cap": agreement.bullet_cap,
                "party_a": agreement.party_a_label,
                "party_b": agreement.party_b_label,
            },
        )

        if agreement.funds_logged_at:
            self.events_repo.append(
                agreement_id=agreement.id,
                event_type="funds_logged",
                payload={"timestamp": agreement.funds_logged_at.isoformat()},
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
