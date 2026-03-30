CREATE TABLE IF NOT EXISTS professional_profile (
    worker_id UUID PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    category VARCHAR(80) NOT NULL,
    rating DOUBLE PRECISION NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    portfolio_images TEXT NOT NULL DEFAULT '',
    CONSTRAINT fk_profile_worker FOREIGN KEY (worker_id) REFERENCES worker_account (id)
);

CREATE TABLE IF NOT EXISTS service_need (
    id UUID PRIMARY KEY,
    client_id UUID NOT NULL,
    title VARCHAR(180) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(80) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS bid_proposal (
    id UUID PRIMARY KEY,
    need_id UUID NOT NULL,
    worker_id UUID NOT NULL,
    labor_cost NUMERIC(10, 2) NOT NULL,
    summary TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_bid_need FOREIGN KEY (need_id) REFERENCES service_need (id),
    CONSTRAINT fk_bid_worker FOREIGN KEY (worker_id) REFERENCES worker_account (id)
);

INSERT INTO professional_profile (worker_id, full_name, category, rating, latitude, longitude, portfolio_images)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Worker Demo', 'ELECTRICISTA', 4.8, -16.5, -68.15, 'uploads/portfolio-1.jpg')
ON CONFLICT (worker_id) DO NOTHING;
