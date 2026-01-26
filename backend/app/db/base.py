from sqlalchemy.orm import declarative_base

Base = declarative_base()


def init_models() -> None:
    """
    Import ORM models so they get registered on Base.metadata.

    Keep imports inside this function to avoid circular imports.
    """
    # noqa: F401 is intentional; import triggers model registration
    from app.db.models import agreement  # noqa: F401
    from app.db.models import event  # noqa: F401
