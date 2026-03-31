-- Enhance work_order table with diagnostic, quotation, completion and rating fields
ALTER TABLE work_order
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS category VARCHAR(100),
ADD COLUMN IF NOT EXISTS diagnostic_summary TEXT,
ADD COLUMN IF NOT EXISTS diagnostic_photos JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS quotation_labor_cost NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS quotation_materials_cost NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS quotation_items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS client_approval_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS work_completion_photos JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS work_notes JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS rating NUMERIC(2,1),
ADD COLUMN IF NOT EXISTS review TEXT,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
