"""add vehicle disponivel provincia municipio

Revision ID: 0002_vehicle_fields
Revises: 0001_initial_schema
Create Date: 2025-06-01

"""
from alembic import op
import sqlalchemy as sa

revision = "0002_vehicle_fields"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("vehicles", sa.Column("disponivel", sa.Boolean(), nullable=False, server_default="true"))
    op.add_column("vehicles", sa.Column("provincia", sa.String(100), nullable=True))
    op.add_column("vehicles", sa.Column("municipio", sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column("vehicles", "municipio")
    op.drop_column("vehicles", "provincia")
    op.drop_column("vehicles", "disponivel")
