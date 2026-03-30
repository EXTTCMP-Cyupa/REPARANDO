CREATE TABLE IF NOT EXISTS business_setting (
    key VARCHAR(80) PRIMARY KEY,
    value VARCHAR(80) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO business_setting(key, value, updated_at)
VALUES
    ('lead_cost', '1.50', NOW()),
    ('trust_credit_limit', '-3.00', NOW())
ON CONFLICT (key) DO NOTHING;
