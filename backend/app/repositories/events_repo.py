from typing import Any, Dict, List

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models.event import Event


class EventsRepo:
    def __init__(self, session: Session):
        self.session = session

    def append(
        self,
        agreement_id: str,
        event_type: str,
        payload: Dict[str, Any],
    ) -> Event:
        evt = Event(
            agreement_id=agreement_id,
            event_type=event_type,
            payload=payload or {},
        )
        self.session.add(evt)
        self.session.commit()
        self.session.refresh(evt)
        return evt

    def list_for_agreement(self, agreement_id: str) -> List[Event]:
        stmt = (
            select(Event)
            .where(Event.agreement_id == agreement_id)
            .order_by(Event.created_at.asc())
        )
        return list(self.session.execute(stmt).scalars().all())
