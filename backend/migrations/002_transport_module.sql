-- ============================================================================
-- MIGRATIONS SQL - MÓDULO 3: TRANSPORTE RURAL
-- AgroLink - PostgreSQL
-- ============================================================================

-- ============================================================================
-- 1. TABELA: TRANSPORTADORES
-- ============================================================================

CREATE TABLE IF NOT EXISTS transporters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255) NOT NULL,
    identification_number VARCHAR(50) NOT NULL UNIQUE,
    rating DECIMAL(3,2) DEFAULT 0,
    total_reviews INT DEFAULT 0,
    total_earnings DECIMAL(15,2) DEFAULT 0,
    profile_picture_url TEXT,
    document_url TEXT,
    insurance_valid_until DATE,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    bank_account_id UUID REFERENCES bank_accounts(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_is_active (is_active),
    INDEX idx_rating (rating)
);

-- ============================================================================
-- 2. TABELA: VEÍCULOS
-- ============================================================================

CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transporter_id UUID NOT NULL REFERENCES transporters(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'Caminhão', 'Carrinha', 'Trator', 'Reboque'
    capacity INT NOT NULL, -- em kg
    capacity_used INT DEFAULT 0,
    plate VARCHAR(20) NOT NULL UNIQUE,
    registration_number VARCHAR(50) NOT NULL UNIQUE,
    brand VARCHAR(100),
    model VARCHAR(100),
    year INT,
    insurance_valid_until DATE,
    inspection_valid_until DATE,
    is_available BOOLEAN DEFAULT TRUE,
    current_location GEOGRAPHY(POINT, 4326), -- PostGIS para localização
    gps_tracking_active BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_transporter_id (transporter_id),
    INDEX idx_plate (plate),
    INDEX idx_is_available (is_available),
    INDEX idx_location (current_location) USING GIST
);

-- ============================================================================
-- 3. TABELA: PEDIDOS DE TRANSPORTE (REQUESTS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS transport_requests (
    id VARCHAR(20) PRIMARY KEY, -- TRN001, TRN002, etc
    farmer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL, -- 'toneladas', 'kg', 'litros'
    weight INT NOT NULL, -- em kg
    
    -- Localização
    origin_address VARCHAR(255) NOT NULL,
    origin_latitude DECIMAL(9,6),
    origin_longitude DECIMAL(9,6),
    destination_address VARCHAR(255) NOT NULL,
    destination_latitude DECIMAL(9,6),
    destination_longitude DECIMAL(9,6),
    distance DECIMAL(8,2), -- em km
    
    -- Status e Transportador
    status VARCHAR(50) NOT NULL DEFAULT 'pendente', 
    -- 'pendente', 'aceite', 'em_andamento', 'em_entrega', 'concluido', 'cancelado'
    transporter_id UUID REFERENCES transporters(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    
    -- Preço e Comissão
    base_price DECIMAL(15,2) NOT NULL,
    commission_percentage DECIMAL(5,2) DEFAULT 5,
    commission_amount DECIMAL(15,2) NOT NULL,
    transporter_receives DECIMAL(15,2) NOT NULL,
    platform_receives DECIMAL(15,2) NOT NULL,
    
    -- ETA
    scheduled_date TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    started_at TIMESTAMP,
    estimated_arrival TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Notas
    notes TEXT,
    cancellation_reason TEXT,
    
    -- Rastreamento
    current_latitude DECIMAL(9,6),
    current_longitude DECIMAL(9,6),
    current_speed INT DEFAULT 0, -- km/h
    last_location_update TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_farmer_id (farmer_id),
    INDEX idx_transporter_id (transporter_id),
    INDEX idx_status (status),
    INDEX idx_scheduled_date (scheduled_date),
    INDEX idx_created_at (created_at)
);

-- ============================================================================
-- 4. TABELA: PONTOS DE CARGA (LOAD POINTS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS load_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transport_request_id VARCHAR(20) NOT NULL REFERENCES transport_requests(id) ON DELETE CASCADE,
    sequence INT NOT NULL,
    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,
    address VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
    scheduled_time TIMESTAMP,
    arrived_at TIMESTAMP,
    completed_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_transport_request_id (transport_request_id),
    INDEX idx_status (status),
    UNIQUE(transport_request_id, sequence)
);

-- ============================================================================
-- 5. TABELA: HISTÓRICO DE LOCALIZAÇÃO (GPS TRACKING)
-- ============================================================================

CREATE TABLE IF NOT EXISTS location_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transport_request_id VARCHAR(20) NOT NULL REFERENCES transport_requests(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    latitude DECIMAL(9,6) NOT NULL,
    longitude DECIMAL(9,6) NOT NULL,
    speed INT, -- km/h
    direction VARCHAR(2), -- N, NE, E, SE, S, SW, W, NW
    accuracy INT, -- em metros
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_transport_request_id (transport_request_id),
    INDEX idx_vehicle_id (vehicle_id),
    INDEX idx_recorded_at (recorded_at),
    INDEX idx_location (latitude, longitude) USING GIST
);

-- Tabela particionada por data para melhor performance
CREATE TABLE location_history_2024_06 PARTITION OF location_history
    FOR VALUES FROM ('2024-06-01') TO ('2024-07-01');

-- ============================================================================
-- 6. TABELA: ROTAS PUBLICADAS (SHARED LOADS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS published_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transporter_id UUID NOT NULL REFERENCES transporters(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    origin_address VARCHAR(255) NOT NULL,
    origin_latitude DECIMAL(9,6),
    origin_longitude DECIMAL(9,6),
    destination_address VARCHAR(255) NOT NULL,
    destination_latitude DECIMAL(9,6),
    destination_longitude DECIMAL(9,6),
    departure_time TIMESTAMP NOT NULL,
    available_capacity INT NOT NULL, -- em kg
    used_capacity INT DEFAULT 0,
    price_per_ton DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'cancelled'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_transporter_id (transporter_id),
    INDEX idx_departure_time (departure_time),
    INDEX idx_status (status)
);

-- ============================================================================
-- 7. TABELA: AVALIAÇÕES (RATINGS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS transport_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transport_request_id VARCHAR(20) NOT NULL UNIQUE REFERENCES transport_requests(id) ON DELETE CASCADE,
    
    -- Avaliação do Agricultor sobre Transportador
    farmer_to_transporter_rating INT, -- 1-5
    farmer_to_transporter_criteria JSONB DEFAULT '{}',
    farmer_to_transporter_comment TEXT,
    farmer_rated_at TIMESTAMP,
    
    -- Avaliação do Transportador sobre Agricultor
    transporter_to_farmer_rating INT, -- 1-5
    transporter_to_farmer_criteria JSONB DEFAULT '{}',
    transporter_to_farmer_comment TEXT,
    transporter_rated_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_transport_request_id (transport_request_id)
);

-- ============================================================================
-- 8. TABELA: PAGAMENTOS (PAYMENTS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS transport_payments (
    id VARCHAR(20) PRIMARY KEY, -- PAY001, PAY002, etc
    transport_request_id VARCHAR(20) NOT NULL UNIQUE REFERENCES transport_requests(id) ON DELETE CASCADE,
    farmer_id UUID NOT NULL REFERENCES users(id),
    transporter_id UUID NOT NULL REFERENCES transporters(id),
    
    -- Valores
    total_amount DECIMAL(15,2) NOT NULL,
    commission_amount DECIMAL(15,2) NOT NULL,
    transporter_receives DECIMAL(15,2) NOT NULL,
    
    -- Pagamento
    payment_method VARCHAR(50) NOT NULL, -- 'multicaixa', 'bank_transfer', 'wallet'
    payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    
    -- Informações de pagamento
    farmer_payment_reference VARCHAR(100),
    farmer_paid_at TIMESTAMP,
    
    -- Retirada
    payout_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    payout_method VARCHAR(50),
    payout_date TIMESTAMP,
    payout_reference VARCHAR(100),
    
    -- Metadados
    multicaixa_transaction_id VARCHAR(100),
    error_message TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_transport_request_id (transport_request_id),
    INDEX idx_farmer_id (farmer_id),
    INDEX idx_transporter_id (transporter_id),
    INDEX idx_payment_status (payment_status),
    INDEX idx_created_at (created_at)
);

-- ============================================================================
-- 9. TABELA: MENSAGENS DE CHAT TRANSPORTE
-- ============================================================================

CREATE TABLE IF NOT EXISTS transport_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transport_request_id VARCHAR(20) NOT NULL REFERENCES transport_requests(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    sender_type VARCHAR(20) NOT NULL, -- 'farmer', 'transporter'
    message TEXT NOT NULL,
    attachment_url TEXT,
    location_latitude DECIMAL(9,6),
    location_longitude DECIMAL(9,6),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_transport_request_id (transport_request_id),
    INDEX idx_sender_id (sender_id),
    INDEX idx_created_at (created_at)
);

-- ============================================================================
-- 10. TABELA: NOTIFICAÇÕES
-- ============================================================================

CREATE TABLE IF NOT EXISTS transport_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transport_request_id VARCHAR(20) REFERENCES transport_requests(id) ON DELETE CASCADE,
    
    type VARCHAR(50) NOT NULL, -- 'transportador_aceita', 'proximo_chegada', 'entrega_concluida'
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    
    is_read BOOLEAN DEFAULT FALSE,
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
);

-- ============================================================================
-- 11. ÍNDICES ADICIONAIS PARA PERFORMANCE
-- ============================================================================

-- Índice para buscar transportadores próximos
CREATE INDEX idx_vehicles_location_active 
ON vehicles USING GIST(current_location) 
WHERE is_available = TRUE;

-- Índice para transportes ativos
CREATE INDEX idx_transport_active_status 
ON transport_requests (status, created_at) 
WHERE status IN ('pendente', 'aceite', 'em_andamento');

-- Índice para histórico de localização (particionado)
CREATE INDEX idx_location_history_recent 
ON location_history (transport_request_id, recorded_at DESC);

-- ============================================================================
-- 12. VIEWS ÚTEIS
-- ============================================================================

-- View: Ganhos do Transportador Hoje
CREATE OR REPLACE VIEW transporter_earnings_today AS
SELECT 
    t.id,
    t.name,
    COUNT(tr.id) as completed_trips,
    SUM(tr.transporter_receives) as total_earnings,
    AVG(tr2.transporter_to_farmer_rating) as average_rating
FROM transporters t
LEFT JOIN transport_requests tr 
    ON t.id = tr.transporter_id 
    AND tr.status = 'concluido'
    AND DATE(tr.completed_at) = CURRENT_DATE
LEFT JOIN transport_ratings tr2 
    ON tr.id = tr2.transport_request_id
GROUP BY t.id, t.name;

-- View: Pedidos Pendentes por Região
CREATE OR REPLACE VIEW pending_requests_by_region AS
SELECT 
    tr.id,
    tr.farmer_id,
    tr.origin_address,
    tr.product_id,
    tr.weight,
    tr.base_price,
    COUNT(DISTINCT v.transporter_id) as nearby_transporters
FROM transport_requests tr
LEFT JOIN vehicles v 
    ON ST_DWithin(
        v.current_location::geography,
        ST_SetSRID(ST_MakePoint(tr.origin_longitude, tr.origin_latitude), 4326)::geography,
        50000 -- 50km
    )
WHERE tr.status = 'pendente'
GROUP BY tr.id, tr.farmer_id, tr.origin_address, tr.product_id, tr.weight, tr.base_price;

-- View: Veículos Disponíveis com Capacidade
CREATE OR REPLACE VIEW available_vehicles_with_capacity AS
SELECT 
    v.id,
    v.transporter_id,
    t.name as transporter_name,
    t.rating,
    v.type,
    v.plate,
    v.capacity,
    v.capacity_used,
    (v.capacity - v.capacity_used) as available_capacity,
    v.current_location,
    ST_Distance(
        v.current_location::geography,
        ST_SetSRID(ST_MakePoint(13.2344, -8.8383), 4326)::geography
    ) / 1000 as distance_from_request_km
FROM vehicles v
JOIN transporters t ON v.transporter_id = t.id
WHERE v.is_available = TRUE
    AND t.is_active = TRUE
    AND (v.capacity - v.capacity_used) > 0
ORDER BY distance_from_request_km ASC;

-- ============================================================================
-- 13. TRIGGERS PARA LÓGICA AUTOMÁTICA
-- ============================================================================

-- Trigger: Atualizar ETA quando transportador aceita
CREATE OR REPLACE FUNCTION update_eta_on_acceptance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'aceite' AND OLD.status = 'pendente' THEN
        NEW.estimated_arrival := CURRENT_TIMESTAMP + INTERVAL '2 hours';
        NEW.accepted_at := CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_eta_on_acceptance
BEFORE UPDATE ON transport_requests
FOR EACH ROW
EXECUTE FUNCTION update_eta_on_acceptance();

-- Trigger: Registrar mudanças de status
CREATE OR REPLACE FUNCTION log_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status != OLD.status THEN
        INSERT INTO transport_status_history (transport_request_id, old_status, new_status, changed_at)
        VALUES (NEW.id, OLD.status, NEW.status, CURRENT_TIMESTAMP);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_status_change
AFTER UPDATE ON transport_requests
FOR EACH ROW
EXECUTE FUNCTION log_status_change();

-- Tabela de histórico de status
CREATE TABLE IF NOT EXISTS transport_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transport_request_id VARCHAR(20) REFERENCES transport_requests(id),
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_transport_request_id (transport_request_id),
    INDEX idx_changed_at (changed_at)
);

-- Trigger: Atualizar rating do transportador
CREATE OR REPLACE FUNCTION update_transporter_rating()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.transporter_to_farmer_rating IS NOT NULL THEN
        UPDATE transporters 
        SET rating = (
            SELECT AVG(transporter_to_farmer_rating)
            FROM transport_ratings
            WHERE transporter_id = transporters.id
        ),
        total_reviews = total_reviews + 1
        WHERE id = (
            SELECT transporter_id FROM transport_requests WHERE id = NEW.transport_request_id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_transporter_rating
AFTER INSERT OR UPDATE ON transport_ratings
FOR EACH ROW
EXECUTE FUNCTION update_transporter_rating();

-- ============================================================================
-- INSERTS DE TESTE
-- ============================================================================

-- Nota: Estes são apenas exemplos. Ajuste conforme necessário.

INSERT INTO transporters (user_id, name, phone, email, identification_number, is_verified)
VALUES (
    gen_random_uuid(),
    'Transportes Kamba',
    '+244 923 111 222',
    'kamba@transport.ao',
    '123456789',
    TRUE
);

INSERT INTO vehicles (transporter_id, type, capacity, plate, registration_number, is_available)
SELECT id, 'Caminhão 10t', 10000, 'LU-25-AB', 'REG123', TRUE
FROM transporters WHERE name = 'Transportes Kamba'
LIMIT 1;

-- ============================================================================
-- GRANTS DE SEGURANÇA
-- ============================================================================

-- Apenas agricultor pode ver seus próprios pedidos
-- Apenas transportador pode ver pedidos que aceitou
-- Admin pode ver tudo

-- ============================================================================
-- BACKUP E MAINTENANCE
-- ============================================================================

-- Manter apenas 6 meses de histórico de localização
DELETE FROM location_history 
WHERE recorded_at < CURRENT_TIMESTAMP - INTERVAL '6 months';

-- Analizar tabelas para otimização de query
ANALYZE transport_requests;
ANALYZE location_history;
ANALYZE transport_ratings;

COMMIT;
