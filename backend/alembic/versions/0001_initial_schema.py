"""initial schema

Revision ID: 0001
Revises: 
Create Date: 2026-06-12

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # users
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('nome', sa.String(150), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('telefone', sa.String(30), nullable=True),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('role', sa.Enum('agricultor', 'comprador', 'transportador', 'proprietario_maquinas', 'admin', name='userrole'), nullable=False),
        sa.Column('provincia', sa.String(100), nullable=True),
        sa.Column('municipio', sa.String(100), nullable=True),
        sa.Column('foto_perfil_url', sa.String(500), nullable=True),
        sa.Column('bio', sa.String(500), nullable=True),
        sa.Column('email_verificado', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('telefone_verificado', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('ativo', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('atualizado_em', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_users_email', 'users', ['email'], unique=True)
    op.create_index('ix_users_telefone', 'users', ['telefone'], unique=True)

    # vehicles
    op.create_table(
        'vehicles',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('proprietario_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tipo', sa.Enum('caminhao', 'carrinha', 'trator_carga', 'reboque', name='vehicletype'), nullable=False),
        sa.Column('matricula', sa.String(20), nullable=False),
        sa.Column('capacidade_toneladas', sa.Numeric(8, 2), nullable=False),
        sa.Column('descricao', sa.String(500), nullable=True),
        sa.Column('ativo', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['proprietario_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('matricula'),
    )

    # products
    op.create_table(
        'products',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('nome', sa.String(150), nullable=False),
        sa.Column('descricao', sa.String(2000), nullable=True),
        sa.Column('categoria', sa.Enum('cereais', 'leguminosas', 'tuberculos', 'hortalicas', 'frutas', 'outros', name='productcategory'), nullable=False),
        sa.Column('preco', sa.Numeric(12, 2), nullable=False),
        sa.Column('quantidade', sa.Numeric(12, 2), nullable=False),
        sa.Column('unidade', sa.Enum('kg', 'tonelada', 'saco', 'unidade', 'litro', name='productunit'), nullable=False),
        sa.Column('imagens', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('provincia', sa.String(100), nullable=False),
        sa.Column('municipio', sa.String(100), nullable=False),
        sa.Column('agricultor_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('ativo', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('atualizado_em', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['agricultor_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_products_categoria', 'products', ['categoria'])
    op.create_index('ix_products_provincia', 'products', ['provincia'])
    op.create_index('ix_products_municipio', 'products', ['municipio'])

    # transport_routes
    op.create_table(
        'transport_routes',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('veiculo_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('transportador_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('origem', sa.String(200), nullable=False),
        sa.Column('destino', sa.String(200), nullable=False),
        sa.Column('data', sa.Date(), nullable=False),
        sa.Column('preco_por_tonelada', sa.Numeric(12, 2), nullable=False),
        sa.Column('capacidade_total_toneladas', sa.Numeric(8, 2), nullable=False),
        sa.Column('capacidade_disponivel_toneladas', sa.Numeric(8, 2), nullable=False),
        sa.Column('ativo', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['veiculo_id'], ['vehicles.id']),
        sa.ForeignKeyConstraint(['transportador_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # transport_requests
    op.create_table(
        'transport_requests',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('agricultor_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('rota_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('produto', sa.String(150), nullable=False),
        sa.Column('peso_toneladas', sa.Numeric(8, 2), nullable=False),
        sa.Column('origem', sa.String(200), nullable=False),
        sa.Column('destino', sa.String(200), nullable=False),
        sa.Column('data', sa.Date(), nullable=False),
        sa.Column('observacoes', sa.String(500), nullable=True),
        sa.Column('status', sa.Enum('pendente', 'aceite', 'em_andamento', 'concluido', 'cancelado', name='transportstatus'), nullable=False, server_default='pendente'),
        sa.Column('valor_total', sa.Numeric(14, 2), nullable=True),
        sa.Column('comissao_percentual', sa.Numeric(5, 2), nullable=True),
        sa.Column('valor_comissao', sa.Numeric(14, 2), nullable=True),
        sa.Column('valor_liquido_transportador', sa.Numeric(14, 2), nullable=True),
        sa.Column('latitude_atual', sa.Numeric(10, 6), nullable=True),
        sa.Column('longitude_atual', sa.Numeric(10, 6), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('atualizado_em', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['agricultor_id'], ['users.id']),
        sa.ForeignKeyConstraint(['rota_id'], ['transport_routes.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # machines
    op.create_table(
        'machines',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('proprietario_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tipo', sa.Enum('trator', 'colheitadeira', 'arado', 'plantadora', 'irrigacao', 'outros', name='machinetype'), nullable=False),
        sa.Column('nome', sa.String(150), nullable=False),
        sa.Column('descricao', sa.String(1000), nullable=True),
        sa.Column('preco_diaria', sa.Numeric(12, 2), nullable=False),
        sa.Column('provincia', sa.String(100), nullable=False),
        sa.Column('municipio', sa.String(100), nullable=False),
        sa.Column('imagens', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('disponivel', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['proprietario_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )

    # machine_rentals
    op.create_table(
        'machine_rentals',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('maquina_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('locatario_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('data_inicio', sa.Date(), nullable=False),
        sa.Column('data_fim', sa.Date(), nullable=False),
        sa.Column('valor_total', sa.Numeric(14, 2), nullable=False),
        sa.Column('comissao_percentual', sa.Numeric(5, 2), nullable=True),
        sa.Column('valor_comissao', sa.Numeric(14, 2), nullable=True),
        sa.Column('status', sa.Enum('pendente', 'confirmado', 'em_andamento', 'concluido', 'cancelado', name='machinerentalstatus'), nullable=False, server_default='pendente'),
        sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['maquina_id'], ['machines.id']),
        sa.ForeignKeyConstraint(['locatario_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # ratings
    op.create_table(
        'ratings',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('avaliador_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('avaliado_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('pontuacao', sa.Integer(), nullable=False),
        sa.Column('comentario', sa.String(1000), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['avaliador_id'], ['users.id']),
        sa.ForeignKeyConstraint(['avaliado_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # chat_messages
    op.create_table(
        'chat_messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('remetente_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('destinatario_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('conteudo', sa.String(2000), nullable=False),
        sa.Column('tipo', sa.Enum('texto', 'imagem', name='messagetype'), nullable=False, server_default='texto'),
        sa.Column('lido', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['remetente_id'], ['users.id']),
        sa.ForeignKeyConstraint(['destinatario_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # price_records
    op.create_table(
        'price_records',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('produto', sa.Enum('milho', 'feijao', 'mandioca', 'batata', 'tomate', 'banana', 'cafe', 'algodao', name='commoditytype'), nullable=False),
        sa.Column('preco_kg', sa.Numeric(10, 2), nullable=False),
        sa.Column('provincia', sa.String(100), nullable=False),
        sa.Column('fonte', sa.String(200), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id'),
    )

    # map_locations
    op.create_table(
        'map_locations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tipo', sa.Enum('fazenda', 'produto', 'maquina', 'transportador', 'cooperativa', name='mapentitytype'), nullable=False),
        sa.Column('referencia_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('utilizador_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('nome', sa.String(150), nullable=False),
        sa.Column('descricao', sa.String(500), nullable=True),
        sa.Column('latitude', sa.Numeric(10, 6), nullable=False),
        sa.Column('longitude', sa.Numeric(10, 6), nullable=False),
        sa.Column('provincia', sa.String(100), nullable=True),
        sa.Column('municipio', sa.String(100), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['utilizador_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )

    # payments
    op.create_table(
        'payments',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('utilizador_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('referencia_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('tipo', sa.Enum('transporte', 'aluguel_maquina', 'comissao', name='paymenttype'), nullable=False),
        sa.Column('valor', sa.Numeric(14, 2), nullable=False),
        sa.Column('status', sa.Enum('pendente', 'pago', 'falhado', 'reembolsado', name='paymentstatus'), nullable=False, server_default='pendente'),
        sa.Column('referencia_externa', sa.String(200), nullable=True),
        sa.Column('criado_em', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['utilizador_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('payments')
    op.drop_table('map_locations')
    op.drop_table('price_records')
    op.drop_table('chat_messages')
    op.drop_table('ratings')
    op.drop_table('machine_rentals')
    op.drop_table('machines')
    op.drop_table('transport_requests')
    op.drop_table('transport_routes')
    op.drop_table('products')
    op.drop_table('vehicles')
    op.drop_table('users')
    op.execute('DROP TYPE IF EXISTS paymentstatus')
    op.execute('DROP TYPE IF EXISTS paymenttype')
    op.execute('DROP TYPE IF EXISTS mapentitytype')
    op.execute('DROP TYPE IF EXISTS commoditytype')
    op.execute('DROP TYPE IF EXISTS messagetype')
    op.execute('DROP TYPE IF EXISTS machinerentalstatus')
    op.execute('DROP TYPE IF EXISTS machinetype')
    op.execute('DROP TYPE IF EXISTS transportstatus')
    op.execute('DROP TYPE IF EXISTS productunit')
    op.execute('DROP TYPE IF EXISTS productcategory')
    op.execute('DROP TYPE IF EXISTS vehicletype')
    op.execute('DROP TYPE IF EXISTS userrole')
