CREATE TABLE IF NOT EXISTS work_material (
    id UUID PRIMARY KEY,
    work_order_id UUID NOT NULL,
    worker_id UUID NOT NULL,
    name VARCHAR(160) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_cost NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT fk_work_material_order FOREIGN KEY (work_order_id) REFERENCES work_order (id),
    CONSTRAINT fk_work_material_worker FOREIGN KEY (worker_id) REFERENCES worker_account (id)
);

CREATE INDEX IF NOT EXISTS idx_work_material_order_created_at ON work_material (work_order_id, created_at DESC);