CREATE TABLE IF NOT EXISTS worker_account (
    id UUID PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(180) NOT NULL UNIQUE,
    balance NUMERIC(10, 2) NOT NULL DEFAULT 0,
    blocked BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS lead_charge (
    id UUID PRIMARY KEY,
    worker_id UUID NOT NULL,
    client_id UUID NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    charged_at TIMESTAMPTZ NOT NULL,
    source VARCHAR(60) NOT NULL,
    CONSTRAINT fk_lead_worker FOREIGN KEY (worker_id) REFERENCES worker_account (id)
);

CREATE TABLE IF NOT EXISTS deposit_receipt (
    id UUID PRIMARY KEY,
    worker_id UUID NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    image_path VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    reviewed_by UUID NULL,
    CONSTRAINT fk_deposit_worker FOREIGN KEY (worker_id) REFERENCES worker_account (id)
);

INSERT INTO worker_account (id, full_name, email, balance, blocked)
VALUES
    ('11111111-1111-1111-1111-111111111111', 'Worker Demo', 'worker@reparando.app', 0.00, FALSE)
ON CONFLICT (id) DO NOTHING;
