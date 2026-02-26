import os
from copy import deepcopy
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
from app.schemas.agreement import AgreementAccept, AgreementCounter, AgreementCreate, AgreementDecline
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
        
        # Development bypass for placeholder intents
        if settings.is_dev and payment_id == "offer-intent":
            return

        if not self.payments_repo:
            raise ValueError("Payments repository not configured")
        payment = self.payments_repo.get(payment_id)
        if not payment or payment.status != "paid":
            raise ValueError("Payment is required before generating agreement")

    def _hydrate_structured_fields(self, data: Any, terms: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Extract structured fields from terms and return them.
        If data is an object, it also tries to set attributes if they are None.
        """
        if terms is None:
            terms = getattr(data, "terms", {}) or {}
        
        updates = {}
        
        # Payout Basis
        payout_basis = getattr(data, "payout_basis", None)
        if payout_basis in (None, ""):
            payout_basis = terms.get("payout_basis")
        if payout_basis:
            updates["payout_basis"] = payout_basis
            
        # Stake Percent
        stake_pct = getattr(data, "stake_percent", None)
        if stake_pct is None and "stake_pct" in terms:
            try:
                stake_pct = float(terms["stake_pct"])
            except (TypeError, ValueError):
                pass
        if stake_pct is not None:
            updates["stake_percent"] = stake_pct

        # Buy-in Amount
        buy_in = getattr(data, "buy_in_amount_cents", None)
        if buy_in is None and "buy_in_amount" in terms:
            try:
                buy_in = int(round(float(terms["buy_in_amount"]) * 100))
            except (TypeError, ValueError):
                pass
        if buy_in is not None:
            updates["buy_in_amount_cents"] = buy_in

        # Bullet Cap
        bullet_cap = getattr(data, "bullet_cap", None)
        if bullet_cap is None and "bullet_cap" in terms:
            try:
                bullet_cap = int(terms["bullet_cap"])
            except (TypeError, ValueError):
                pass
        if bullet_cap is not None:
            updates["bullet_cap"] = bullet_cap

        # Labels
        party_a = getattr(data, "party_a_label", None) or terms.get("party_a_label")
        if party_a: updates["party_a_label"] = party_a
        
        party_b = getattr(data, "party_b_label", None) or terms.get("party_b_label")
        if party_b: updates["party_b_label"] = party_b

        # Dates
        event_date = getattr(data, "event_date", None)
        if event_date is None and terms.get("event_date"):
            try:
                event_date = datetime.fromisoformat(terms["event_date"]).date()
            except (TypeError, ValueError):
                pass
        if event_date: updates["event_date"] = event_date

        due_date = getattr(data, "due_date", None)
        if due_date is None and terms.get("due_date"):
            try:
                due_date = datetime.fromisoformat(terms["due_date"]).date()
            except (TypeError, ValueError):
                pass
        if due_date: updates["due_date"] = due_date

        # Funds Logged
        funds_at = getattr(data, "funds_logged_at", None)
        if funds_at is None and terms.get("funds_received_at"):
            try:
                funds_at = datetime.fromisoformat(terms["funds_received_at"])
            except (TypeError, ValueError):
                pass
        if funds_at: updates["funds_logged_at"] = funds_at

        # If data is an object and has these attributes, set them if they are currently None
        for key, val in updates.items():
            if hasattr(data, key) and getattr(data, key) is None:
                setattr(data, key, val)
                
        return updates

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

    def propose_counter(self, agreement_id: str, data: AgreementCounter) -> Agreement:
        agreement = self.agreements_repo.get_by_id(agreement_id)
        if not agreement:
            raise ValueError(f"Agreement {agreement_id} not found")
        if agreement.negotiation_state in {"accepted", "declined"}:
            raise ValueError("Cannot counter a finalized agreement")

        previous_terms = deepcopy(agreement.terms or {})
        agreement.pending_terms = data.terms
        agreement.last_proposed_by = data.proposer_label
        agreement.negotiation_state = "countered"
        agreement.party_a_confirmed_at = None
        agreement.party_b_confirmed_at = None

        # Update structured fields from counter terms
        updates = self._hydrate_structured_fields(data)
        for key, val in updates.items():
            setattr(agreement, key, val)

        self.agreements_repo.update(agreement)

        if self.revisions_repo:
            self.revisions_repo.append(
                agreement_id=agreement.id,
                status="countered",
                terms_snapshot=data.terms,
                proposer_label=data.proposer_label,
            )

        self.events_repo.append(
            agreement_id=agreement.id,
            event_type="negotiation_countered",
            payload={
                "proposer": data.proposer_label,
                "counter_notes": data.counter_notes,
                "term_changes": self._diff_terms(previous_terms, data.terms),
            },
        )
        return agreement

    def _diff_terms(self, old_terms: Dict[str, Any], new_terms: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
        keys = ["stake_pct", "markup", "buy_in_amount", "payout_basis", "bullet_cap"]
        changes: Dict[str, Dict[str, Any]] = {}
        for key in keys:
            old_val = old_terms.get(key)
            new_val = new_terms.get(key)
            if old_val != new_val:
                changes[key] = {"from": old_val, "to": new_val}
        return changes

    def accept_agreement(self, agreement_id: str, data: AgreementAccept) -> Agreement:
        agreement = self.agreements_repo.get_by_id(agreement_id)
        if not agreement:
            raise ValueError(f"Agreement {agreement_id} not found")
        if agreement.negotiation_state == "declined":
            raise ValueError("Cannot accept a declined agreement")

        # If it was countered, use pending_terms as final terms
        if agreement.negotiation_state == "countered" and agreement.pending_terms:
            agreement.terms = agreement.pending_terms

        # Update confirmed_at for explicit party labels only
        if data.accepter_label == agreement.party_a_label:
            agreement.party_a_confirmed_at = datetime.now(timezone.utc)
        elif data.accepter_label == agreement.party_b_label:
            agreement.party_b_confirmed_at = datetime.now(timezone.utc)
        else:
            raise ValueError("accepter_label must match party_a_label or party_b_label")

        # Agreement becomes active only after both parties confirm
        both_confirmed = bool(agreement.party_a_confirmed_at and agreement.party_b_confirmed_at)
        if both_confirmed:
            agreement.negotiation_state = "accepted"
            agreement.status = "active"
        else:
            agreement.negotiation_state = "awaiting_confirmation"
            agreement.status = "draft"

        # Re-compute hash as terms might have changed
        hashable_data = agreement.get_hashable_data()
        agreement.hash = compute_agreement_hash(hashable_data)

        self.agreements_repo.update(agreement)

        # Re-generate artifact
        if self.artifacts_repo:
            self._create_artifact(agreement)

        if self.revisions_repo:
            self.revisions_repo.append(
                agreement_id=agreement.id,
                status="accepted",
                terms_snapshot=agreement.terms,
                proposer_label=data.accepter_label,
            )

        self.events_repo.append(
            agreement_id=agreement.id,
            event_type="agreement_accepted",
            payload={
                "accepter": data.accepter_label,
                "both_confirmed": both_confirmed,
            },
        )
        return agreement

    def decline_agreement(self, agreement_id: str, data: AgreementDecline) -> Agreement:
        agreement = self.agreements_repo.get_by_id(agreement_id)
        if not agreement:
            raise ValueError(f"Agreement {agreement_id} not found")
        if agreement.negotiation_state == "accepted":
            raise ValueError("Cannot decline an accepted agreement")
        if data.decliner_label not in {agreement.party_a_label, agreement.party_b_label}:
            raise ValueError("decliner_label must match party_a_label or party_b_label")

        agreement.negotiation_state = "declined"
        agreement.status = "cancelled"
        agreement.pending_terms = None

        hashable_data = agreement.get_hashable_data()
        agreement.hash = compute_agreement_hash(hashable_data)
        self.agreements_repo.update(agreement)

        if self.revisions_repo:
            self.revisions_repo.append(
                agreement_id=agreement.id,
                status="declined",
                terms_snapshot=agreement.terms,
                proposer_label=data.decliner_label,
            )

        self.events_repo.append(
            agreement_id=agreement.id,
            event_type="agreement_declined",
            payload={"decliner": data.decliner_label, "reason": data.reason},
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
