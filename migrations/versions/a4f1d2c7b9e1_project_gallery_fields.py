"""Add project gallery fields

Revision ID: a4f1d2c7b9e1
Revises: ed591da7c6d7
Create Date: 2026-04-04 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "a4f1d2c7b9e1"
down_revision = "ed591da7c6d7"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("projects", schema=None) as batch_op:
        batch_op.add_column(sa.Column("tech_stack", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("github_link", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("demo_link", sa.String(length=255), nullable=True))
        batch_op.add_column(sa.Column("created_date", sa.String(length=50), nullable=True))


def downgrade():
    with op.batch_alter_table("projects", schema=None) as batch_op:
        batch_op.drop_column("created_date")
        batch_op.drop_column("demo_link")
        batch_op.drop_column("github_link")
        batch_op.drop_column("tech_stack")
