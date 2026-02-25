from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, Field


class AgreementCreate(BaseModel):
    agreement_type: Optional[str] = Field(default=None)
    terms_version: str
    terms: Dict[str, Any]
    payment_id: str


class AgreementArtifactRead(BaseModel):
    verification_url: str
    hash_snapshot: str
    file_path: Optional[str] = None


class AgreementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    agreement_type: str
    terms_version: str
    terms: Dict[str, Any]
    status: str
    payment_id: Optional[str] = None
    hash: Optional[str] = None
    hash_version: Optional[str] = None
    created_at: Optional[datetime] = None
    qr_payload: Optional[Dict[str, Any]] = None
    artifact: Optional[AgreementArtifactRead] = None
