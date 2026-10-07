"""add approval_status to companies

Revision ID: a1b2c3d4e5f6
Revises: 5f623620a9d8
Create Date: 2026-06-13 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '5f623620a9d8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('companies', sa.Column('approval_status', sa.String(), nullable=True))
    # Set all existing companies to 'approved' so they are not locked out
    op.execute("UPDATE companies SET approval_status = 'approved' WHERE approval_status IS NULL")


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('companies', 'approval_status')