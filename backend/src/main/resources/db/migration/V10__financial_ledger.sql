CREATE TABLE IF NOT EXISTS financial_ledger_entry (
    id UUID PRIMARY KEY,
    worker_id UUID NOT NULL,
    entry_type VARCHAR(40) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    description VARCHAR(255) NOT NULL,
    reference_entry_id UUID NULL,
    external_reference VARCHAR(120) NULL,
    created_at TIMESTAMPTZ NOT NULL,
    created_by UUID NOT NULL,
    CONSTRAINT fk_ledger_worker FOREIGN KEY (worker_id) REFERENCES worker_account (id),
    CONSTRAINT fk_ledger_reference FOREIGN KEY (reference_entry_id) REFERENCES financial_ledger_entry (id),
    CONSTRAINT chk_ledger_amount_non_zero CHECK (amount <> 0)
);

CREATE INDEX IF NOT EXISTS idx_ledger_worker_created_at
    ON financial_ledger_entry (worker_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ledger_reference
    ON financial_ledger_entry (reference_entry_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_refund_per_entry
    ON financial_ledger_entry (reference_entry_id)
    WHERE entry_type = 'REFUND' AND reference_entry_id IS NOT NULL;
