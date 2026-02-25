from typing import Optional, List, Dict, Any
from datetime import datetime
from app.repositories.agreements_repo import AgreementsRepo
from app.repositories.events_repo import EventsRepo
from app.schemas.agreement import AgreementCreate
from app.utils.hash_utils import compute_agreement_hash, HASH_VERSION


class AgreementsService:
    """Service layer for agreement operations."""

    def __init__(
        self,
        agreements_repo: AgreementsRepo,
        events_repo: EventsRepo
    ):
        self.agreements_repo = agreements_repo
        self.events_repo = events_repo

    def create_agreement(self, data: AgreementCreate) -> Any:
        """
        Create a new agreement with tamper-evident hash.
        """
        # Create agreement
        agreement = self.agreements_repo.create(data)

        # Compute tamper-evident hash
        hashable_data = agreement.get_hashable_data()
        agreement.hash = compute_agreement_hash(hashable_data)
        agreement.hash_version = HASH_VERSION

        # Update with hash
        self.agreements_repo.session.commit()
        self.agreements_repo.session.refresh(agreement)

        # Emit creation event
        self.events_repo.append(
            agreement_id=agreement.id,
            event_type='agreement_created',
            payload={
                'hash': agreement.hash,
                'hash_version': agreement.hash_version
                }
        )
        return agreement

    def verify_agreement(
        self,
        agreement_id: str,
        provided_hash: str
    ) -> Dict[str, Any]:
        """
        Verify agreement integrity via hash comparison.
        """
        agreement = self.agreements_repo.get_by_id(agreement_id)
        if not agreement:
            raise ValueError(f"Agreement {agreement_id} not found")
        is_valid = agreement.hash == provided_hash
        result = {
            'valid': is_valid,
            'agreement_id': str(agreement.id),
            'stored_hash': agreement.hash,
            'provided_hash': provided_hash,
            'hash_version': agreement.hash_version,
            'verified_at': datetime.utcnow().isoformat() + 'Z'
        }
        # Emit verification event
        self.events_repo.append(
            agreement_id=str(agreement.id),
            event_type='hash_verified',
            payload={'valid': is_valid, 'provided_hash': provided_hash}
        )
        return result

    def get_by_hash(self, hash_value: str) -> Optional[Any]:
        """Look up agreement by hash value."""
        return self.agreements_repo.get_by_hash(hash_value)
