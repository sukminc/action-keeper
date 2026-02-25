"""add payments and artifacts support"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260225_add_payments_and_artifacts"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "agreements",
        sa.Column("payment_id", sa.String(length=36), nullable=True),
    )
    op.create_index(
        "ix_agreements_payment_id",
        "agreements",
        ["payment_id"],
    )

    payments = op.create_table(
        "payments",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("amount_cents", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=10), nullable=False, server_default="usd"),
        sa.Column("stripe_session_id", sa.String(length=64), nullable=False, unique=True),
        sa.Column("agreement_id", sa.String(length=36), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_payments_status",
        "payments",
        ["status"],
    )
    op.create_index(
        "ix_payments_agreement_id",
        "payments",
        ["agreement_id"],
    )

    op.create_table(
        "agreement_artifacts",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("agreement_id", sa.String(length=36), nullable=False, index=True),
        sa.Column("file_path", sa.String(length=255), nullable=False),
        sa.Column("verification_url", sa.String(length=255), nullable=False),
        sa.Column("hash_snapshot", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("agreement_artifacts")
    op.drop_index("ix_payments_agreement_id", table_name="payments")
    op.drop_index("ix_payments_status", table_name="payments")
    op.drop_table("payments")
    op.drop_index("ix_agreements_payment_id", table_name="agreements")
    op.drop_column("agreements", "payment_id")
