"""add negotiation metadata and revisions"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260225_negotiation_fields"
down_revision = "20260225_add_payments_and_artifacts"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "agreements",
        sa.Column(
            "negotiation_state",
            sa.String(length=30),
            nullable=False,
            server_default="draft",
        ),
    )
    op.add_column(
        "agreements",
        sa.Column("pending_terms", sa.JSON(), nullable=True),
    )
    op.add_column(
        "agreements",
        sa.Column("last_proposed_by", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "agreements",
        sa.Column(
            "payout_basis",
            sa.String(length=30),
            nullable=False,
            server_default="gross_payout",
        ),
    )
    op.add_column(
        "agreements",
        sa.Column("stake_percent", sa.Float(), nullable=True),
    )
    op.add_column(
        "agreements",
        sa.Column("buy_in_amount_cents", sa.Integer(), nullable=True),
    )
    op.add_column(
        "agreements",
        sa.Column("bullet_cap", sa.Integer(), nullable=True),
    )
    op.add_column(
        "agreements",
        sa.Column("event_date", sa.Date(), nullable=True),
    )
    op.add_column(
        "agreements",
        sa.Column("due_date", sa.Date(), nullable=True),
    )
    op.add_column(
        "agreements",
        sa.Column("party_a_label", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "agreements",
        sa.Column("party_b_label", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "agreements",
        sa.Column("party_a_confirmed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "agreements",
        sa.Column("party_b_confirmed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "agreements",
        sa.Column("funds_logged_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "agreement_revisions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "agreement_id",
            sa.String(length=36),
            sa.ForeignKey("agreements.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.String(length=30),
            nullable=False,
            server_default="proposed",
        ),
        sa.Column("proposer_label", sa.String(length=100), nullable=True),
        sa.Column("terms", sa.JSON(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_agreement_revisions_agreement_id",
        "agreement_revisions",
        ["agreement_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_agreement_revisions_agreement_id", table_name="agreement_revisions")
    op.drop_table("agreement_revisions")
    op.drop_column("agreements", "funds_logged_at")
    op.drop_column("agreements", "party_b_confirmed_at")
    op.drop_column("agreements", "party_a_confirmed_at")
    op.drop_column("agreements", "party_b_label")
    op.drop_column("agreements", "party_a_label")
    op.drop_column("agreements", "due_date")
    op.drop_column("agreements", "event_date")
    op.drop_column("agreements", "bullet_cap")
    op.drop_column("agreements", "buy_in_amount_cents")
    op.drop_column("agreements", "stake_percent")
    op.drop_column("agreements", "payout_basis")
    op.drop_column("agreements", "last_proposed_by")
    op.drop_column("agreements", "pending_terms")
    op.drop_column("agreements", "negotiation_state")
