-- ==============================================================================
-- PRODUCT COMPANIONS MIGRATION (JABAT - Supabase)
-- Jalankan script SQL ini di: Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

CREATE TABLE IF NOT EXISTS product_companions (
    id TEXT PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    companion_product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_companions_product ON product_companions(product_id);
CREATE INDEX IF NOT EXISTS idx_product_companions_companion ON product_companions(companion_product_id);

-- Enable RLS
ALTER TABLE product_companions ENABLE ROW LEVEL SECURITY;

-- Policies: anyone can read companions, staff can insert/delete
DROP POLICY IF EXISTS "Anyone can view product companions" ON product_companions;
CREATE POLICY "Anyone can view product companions"
ON product_companions FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Staff can manage product companions" ON product_companions;
CREATE POLICY "Staff can manage product companions"
ON product_companions FOR ALL
USING (true)
WITH CHECK (true);
