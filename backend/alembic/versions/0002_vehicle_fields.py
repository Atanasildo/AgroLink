"""add vehicle disponivel provincia municipio

Revision ID: 0002_vehicle_fields
Revises: 0001_initial_schema
Create Date: 2025-06-01

"""
from alembic import op
import sqlalchemy as sa

revision = "0002_vehicle_fields"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    # Usar ADD COLUMN IF NOT EXISTS para ser idempotente
    conn.execute(sa.text(
        "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS disponivel BOOLEAN NOT NULL DEFAULT TRUE"
    ))
    conn.execute(sa.text(
        "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS provincia VARCHAR(100)"
    ))
    conn.execute(sa.text(
        "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS municipio VARCHAR(100)"
    ))


def downgrade() -> None:
    op.drop_column("vehicles", "municipio")
    op.drop_column("vehicles", "provincia")
    op.drop_column("vehicles", "disponivel")
