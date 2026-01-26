from sqlalchemy.types import TypeDecorator
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON


class JsonType(TypeDecorator):
    """
    Use PostgreSQL JSONB when available, otherwise fall back to generic JSON
    (works on SQLite as TEXT-backed JSON in SQLAlchemy).
    """
    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(JSONB())
        return dialect.type_descriptor(JSON())
