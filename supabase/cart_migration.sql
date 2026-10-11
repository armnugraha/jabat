-- ==============================================================================
-- CART ITEMS MIGRATION (JABAT - Supabase)
-- Jalankan script SQL ini di: Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

CREATE TABLE IF NOT EXISTS cart_items (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    selected BOOLEAN NOT NULL DEFAULT TRUE,
    item_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index untuk pencarian cepat berdasarkan user_id
CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(user_id);

-- Trigger otomatis perbarui timestamp updated_at
DROP TRIGGER IF EXISTS trigger_cart_items_updated_at ON cart_items;
CREATE TRIGGER trigger_cart_items_updated_at
BEFORE UPDATE ON cart_items
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Aktifkan Row Level Security (RLS)
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Kebijakan akses (RLS Policies)
DROP POLICY IF EXISTS "Users can manage own cart items" ON cart_items;
CREATE POLICY "Users can manage own cart items"
ON cart_items FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Staff can view all cart items" ON cart_items;
CREATE POLICY "Staff can view all cart items"
ON cart_items FOR SELECT TO authenticated
USING (is_staff());
