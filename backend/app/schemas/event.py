from datetime import datetime
from typing import Any, Dict

from pydantic import BaseModel


class EventRead(BaseModel):
    id: str
    agreement_id: str
    event_type: str
    payload: Dict[str, Any]
    created_at: datetime
