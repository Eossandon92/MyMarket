"""add_business_model_multi_tenancy

Revision ID: 31912e454983
Revises: 0503ac70c8ed
Create Date: 2026-03-04 15:24:46.801287

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '31912e454983'
down_revision = '0503ac70c8ed'
branch_labels = None
depends_on = None


def upgrade():
    # 1) Create business table
    op.create_table('business',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=120), nullable=False),
        sa.Column('slug', sa.String(length=80), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug')
    )

    # 2) Insert a default business so existing rows can reference it
    op.execute("INSERT INTO business (id, name, slug) VALUES (1, 'Mi Minimarket', 'mi-minimarket')")

    # ---- cash_session ----
    with op.batch_alter_table('cash_session', schema=None) as batch_op:
        batch_op.add_column(sa.Column('business_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('user_id', sa.Integer(), nullable=True))

    op.execute("UPDATE cash_session SET business_id = 1")

    with op.batch_alter_table('cash_session', schema=None) as batch_op:
        batch_op.alter_column('business_id', nullable=False)
        batch_op.drop_constraint('cash_session_date_key', type_='unique')
        batch_op.create_unique_constraint('uq_cashsession_business_date', ['business_id', 'date'])
        batch_op.create_foreign_key('fk_cashsession_business', 'business', ['business_id'], ['id'])
        batch_op.create_foreign_key('fk_cashsession_user', 'user', ['user_id'], ['id'])

    # ---- category ----
    with op.batch_alter_table('category', schema=None) as batch_op:
        batch_op.add_column(sa.Column('business_id', sa.Integer(), nullable=True))

    op.execute("UPDATE category SET business_id = 1")

    with op.batch_alter_table('category', schema=None) as batch_op:
        batch_op.alter_column('business_id', nullable=False)
        batch_op.drop_constraint('category_name_key', type_='unique')
        batch_op.create_unique_constraint('uq_category_business_name', ['business_id', 'name'])
        batch_op.create_foreign_key('fk_category_business', 'business', ['business_id'], ['id'])

    # ---- order ----
    with op.batch_alter_table('order', schema=None) as batch_op:
        batch_op.add_column(sa.Column('business_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('user_id', sa.Integer(), nullable=True))

    op.execute("UPDATE \"order\" SET business_id = 1")

    with op.batch_alter_table('order', schema=None) as batch_op:
        batch_op.alter_column('business_id', nullable=False)
        batch_op.create_foreign_key('fk_order_business', 'business', ['business_id'], ['id'])
        batch_op.create_foreign_key('fk_order_user', 'user', ['user_id'], ['id'])

    # ---- product ----
    with op.batch_alter_table('product', schema=None) as batch_op:
        batch_op.add_column(sa.Column('business_id', sa.Integer(), nullable=True))

    op.execute("UPDATE product SET business_id = 1")

    with op.batch_alter_table('product', schema=None) as batch_op:
        batch_op.alter_column('business_id', nullable=False)
        batch_op.drop_constraint('product_barcode_key', type_='unique')
        batch_op.create_unique_constraint('uq_product_business_barcode', ['business_id', 'barcode'])
        batch_op.create_foreign_key('fk_product_business', 'business', ['business_id'], ['id'])

    # ---- user ----
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.add_column(sa.Column('business_id', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('name', sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column('role', sa.String(length=20), nullable=True))

    op.execute("UPDATE \"user\" SET business_id = 1, name = email, role = 'admin'")

    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.alter_column('business_id', nullable=False)
        batch_op.alter_column('name', nullable=False)
        batch_op.alter_column('role', nullable=False)
        batch_op.drop_constraint('user_email_key', type_='unique')
        batch_op.create_unique_constraint('uq_user_business_email', ['business_id', 'email'])
        batch_op.create_foreign_key('fk_user_business', 'business', ['business_id'], ['id'])


def downgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_constraint('fk_user_business', type_='foreignkey')
        batch_op.drop_constraint('uq_user_business_email', type_='unique')
        batch_op.create_unique_constraint('user_email_key', ['email'])
        batch_op.drop_column('role')
        batch_op.drop_column('name')
        batch_op.drop_column('business_id')

    with op.batch_alter_table('product', schema=None) as batch_op:
        batch_op.drop_constraint('fk_product_business', type_='foreignkey')
        batch_op.drop_constraint('uq_product_business_barcode', type_='unique')
        batch_op.create_unique_constraint('product_barcode_key', ['barcode'])
        batch_op.drop_column('business_id')

    with op.batch_alter_table('order', schema=None) as batch_op:
        batch_op.drop_constraint('fk_order_user', type_='foreignkey')
        batch_op.drop_constraint('fk_order_business', type_='foreignkey')
        batch_op.drop_column('user_id')
        batch_op.drop_column('business_id')

    with op.batch_alter_table('category', schema=None) as batch_op:
        batch_op.drop_constraint('fk_category_business', type_='foreignkey')
        batch_op.drop_constraint('uq_category_business_name', type_='unique')
        batch_op.create_unique_constraint('category_name_key', ['name'])
        batch_op.drop_column('business_id')

    with op.batch_alter_table('cash_session', schema=None) as batch_op:
        batch_op.drop_constraint('fk_cashsession_user', type_='foreignkey')
        batch_op.drop_constraint('fk_cashsession_business', type_='foreignkey')
        batch_op.drop_constraint('uq_cashsession_business_date', type_='unique')
        batch_op.create_unique_constraint('cash_session_date_key', ['date'])
        batch_op.drop_column('user_id')
        batch_op.drop_column('business_id')

    op.drop_table('business')
