"""initial tables"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "v1_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "agreements",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("agreement_type", sa.String(length=50), nullable=False),
        sa.Column("terms_version", sa.String(length=50), nullable=False),
        sa.Column("terms", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("hash", sa.String(length=64), nullable=True),
        sa.Column("hash_version", sa.String(length=10), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )
    op.create_index("ix_agreements_hash", "agreements", ["hash"], unique=False)

    op.create_table(
        "events",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "agreement_id",
            sa.String(length=36),
            sa.ForeignKey("agreements.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )
    op.create_index("ix_events_agreement_id", "events", ["agreement_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_events_agreement_id", table_name="events")
    op.drop_table("events")
    op.drop_index("ix_agreements_hash", table_name="agreements")
    op.drop_table("agreements")
