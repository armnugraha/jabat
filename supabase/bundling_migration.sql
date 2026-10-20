-- ==============================================================================
-- BUNDLING PACKAGES & ITEMS MIGRATION (JABAT - Supabase)
-- Jalankan script SQL ini di: Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

-- 1. Bundling Packages Table
CREATE TABLE IF NOT EXISTS bundling_packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL, -- e.g. 'Ibu Hamil', 'Ibu Menyusui', 'Kesehatan Otak', etc.
    description TEXT NOT NULL DEFAULT '',
    image_url TEXT,
    original_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (original_price >= 0),
    bundle_price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (bundle_price >= 0),
    savings_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (savings_amount >= 0),
    savings_percentage INT NOT NULL DEFAULT 0 CHECK (savings_percentage >= 0 AND savings_percentage <= 100),
    badge TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Bundling Items Table
CREATE TABLE IF NOT EXISTS bundling_items (
    id TEXT PRIMARY KEY,
    bundle_id TEXT NOT NULL REFERENCES bundling_packages(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    variant_id TEXT NOT NULL,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bundling_packages_category ON bundling_packages(category);
CREATE INDEX IF NOT EXISTS idx_bundling_packages_active ON bundling_packages(is_active);
CREATE INDEX IF NOT EXISTS idx_bundling_items_bundle ON bundling_items(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundling_items_product ON bundling_items(product_id);

-- Enable RLS
ALTER TABLE bundling_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundling_items ENABLE ROW LEVEL SECURITY;

-- Policies for Bundling Packages
DROP POLICY IF EXISTS "Anyone can view active bundling packages" ON bundling_packages;
CREATE POLICY "Anyone can view active bundling packages"
ON bundling_packages FOR SELECT
USING (is_active = true OR is_staff());

DROP POLICY IF EXISTS "Staff can manage bundling packages" ON bundling_packages;
CREATE POLICY "Staff can manage bundling packages"
ON bundling_packages FOR ALL TO authenticated
USING (is_staff())
WITH CHECK (is_staff());

-- Policies for Bundling Items
DROP POLICY IF EXISTS "Anyone can view bundling items" ON bundling_items;
CREATE POLICY "Anyone can view bundling items"
ON bundling_items FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Staff can manage bundling items" ON bundling_items;
CREATE POLICY "Staff can manage bundling items"
ON bundling_items FOR ALL TO authenticated
USING (is_staff())
WITH CHECK (is_staff());
