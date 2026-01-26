from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, Field


class AgreementCreate(BaseModel):
    agreement_type: Optional[str] = Field(default=None)
    terms_version: str
    terms: Dict[str, Any]


class AgreementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    agreement_type: str
    terms_version: str
    terms: Dict[str, Any]
    status: str
