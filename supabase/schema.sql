-- ==============================================================================
-- APOTEK SEHAT MANDIRI - SUPABASE POSTGRESQL RELATIONAL SCHEMA & RLS POLICIES
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Custom Types & Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('customer', 'pharmacist', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM (
        'pending',
        'waiting_prescription',
        'prescription_review',
        'confirmed',
        'preparing',
        'out_for_delivery',
        'completed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM (
        'pending',
        'waiting_confirmation',
        'paid',
        'failed',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE prescription_status AS ENUM (
        'pending',
        'approved',
        'needs_revision',
        'rejected'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Profiles Table (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'customer',
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    sipa_number TEXT, -- Specific to pharmacists
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Products Table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    requires_prescription BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    bpom_number TEXT,
    manufacturer TEXT,
    indications TEXT,
    composition TEXT,
    dosage TEXT,
    precautions TEXT,
    storage_instructions TEXT DEFAULT 'Simpan pada suhu ruangan (<30°C), tempat sejuk dan kering, terlindung dari paparan cahaya matahari langsung.',
    image_url TEXT,
    images TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Product Variants / Packaging Table
CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g. "Strip", "Tablet", "Box", "Botol"
    unit TEXT NOT NULL, -- e.g. "tablet", "kapsul", "ml", "gram"
    quantity_per_package INT NOT NULL DEFAULT 1, -- e.g. 10 for Strip (10 tablet)
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    strike_price NUMERIC(12, 2) CHECK (strike_price >= price),
    discount_percentage INT DEFAULT 0,
    stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Customer Addresses Table
CREATE TABLE IF NOT EXISTS customer_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    label TEXT NOT NULL DEFAULT 'Rumah', -- 'Rumah', 'Kantor', 'Apotek'
    recipient_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address_line TEXT NOT NULL,
    subdistrict TEXT,
    district TEXT,
    city TEXT DEFAULT 'Jakarta Selatan',
    postal_code TEXT,
    delivery_notes TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Promotions Table
CREATE TABLE IF NOT EXISTS promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(12, 2) NOT NULL CHECK (discount_value > 0),
    min_order_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    max_discount NUMERIC(12, 2),
    start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    banner_image TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    status order_status NOT NULL DEFAULT 'pending',
    payment_method TEXT NOT NULL CHECK (payment_method IN ('bank_transfer', 'qris', 'cod')),
    payment_status payment_status NOT NULL DEFAULT 'pending',
    payment_proof_path TEXT,
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
    delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
    total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
    delivery_option TEXT NOT NULL DEFAULT 'express', -- 'express', 'regular', 'pickup'
    delivery_address JSONB NOT NULL,
    customer_note TEXT,
    requires_prescription BOOLEAN NOT NULL DEFAULT FALSE,
    prescription_status prescription_status DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Order Items Table (Immutable Snapshots)
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL,
    product_name_snapshot TEXT NOT NULL,
    variant_name_snapshot TEXT NOT NULL,
    unit_snapshot TEXT NOT NULL,
    quantity_per_package_snapshot INT NOT NULL,
    price_snapshot NUMERIC(12, 2) NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(12, 2) NOT NULL CHECK (subtotal >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. Prescriptions Table
CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    status prescription_status NOT NULL DEFAULT 'pending',
    pharmacist_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    pharmacist_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_pharmacist_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Messages Table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    attachment_path TEXT,
    recommended_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 14. Store Settings Table
CREATE TABLE IF NOT EXISTS store_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_name TEXT NOT NULL DEFAULT 'Apotek Sehat Mandiri',
    tagline TEXT DEFAULT 'Farmasi Digital Resmi & Terpercaya',
    branch_name TEXT DEFAULT 'Tebet Barat, Jakarta Selatan',
    address TEXT DEFAULT 'Jl. Tebet Barat Dalam Raya No. 42, RT.05/RW.02, Tebet Barat, Jakarta Selatan, DKI Jakarta 12810',
    phone TEXT DEFAULT '0812-3456-7890',
    whatsapp TEXT DEFAULT '6281234567890',
    email TEXT DEFAULT 'layanan@apoteksehatmandiri.com',
    maps_url TEXT,
    pharmacist_name TEXT DEFAULT 'apt. Siti Rahma, S.Farm.',
    pharmacist_sipa TEXT DEFAULT '19870412/SIPA-31.74/2021/2048',
    is_open BOOLEAN NOT NULL DEFAULT TRUE,
    opening_time TEXT DEFAULT '08:00',
    closing_time TEXT DEFAULT '21:00',
    express_delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 10000,
    regular_delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 15000,
    free_delivery_threshold NUMERIC(12, 2) NOT NULL DEFAULT 100000,
    bank_transfer_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    bank_name TEXT DEFAULT 'Bank Central Asia (BCA)',
    bank_account_number TEXT DEFAULT '8830-1928-4411',
    bank_account_holder TEXT DEFAULT 'Apotek Sehat Mandiri',
    qris_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    qris_image_url TEXT,
    cod_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    min_order_amount NUMERIC(12, 2) NOT NULL DEFAULT 10000,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_customer ON prescriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_order ON prescriptions(order_id);
CREATE INDEX IF NOT EXISTS idx_conversations_customer ON conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_addresses_customer ON customer_addresses(customer_id);

-- ==============================================================================
-- AUTOMATED UPDATED_AT TIMESTAMP TRIGGER
-- ==============================================================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_timestamp();
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE PROCEDURE update_timestamp();
CREATE TRIGGER trg_variants_updated BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE PROCEDURE update_timestamp();
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON orders FOR EACH ROW EXECUTE PROCEDURE update_timestamp();
CREATE TRIGGER trg_prescriptions_updated BEFORE UPDATE ON prescriptions FOR EACH ROW EXECUTE PROCEDURE update_timestamp();
CREATE TRIGGER trg_conversations_updated BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE PROCEDURE update_timestamp();
CREATE TRIGGER trg_store_settings_updated BEFORE UPDATE ON store_settings FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Helper function: Is Admin or Pharmacist?
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'pharmacist')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function: Is Admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Public profiles can be viewed by authenticated users"
ON profiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Categories Policies
CREATE POLICY "Anyone can view active categories"
ON categories FOR SELECT USING (true);

CREATE POLICY "Staff can manage categories"
ON categories FOR ALL TO authenticated USING (is_staff());

-- Products Policies
CREATE POLICY "Anyone can view active products"
ON products FOR SELECT USING (is_active = true OR is_staff());

CREATE POLICY "Staff can manage products"
ON products FOR ALL TO authenticated USING (is_staff());

-- Product Variants Policies
CREATE POLICY "Anyone can view active variants"
ON product_variants FOR SELECT USING (is_active = true OR is_staff());

CREATE POLICY "Staff can manage variants"
ON product_variants FOR ALL TO authenticated USING (is_staff());

-- Customer Addresses Policies
CREATE POLICY "Customers can manage own addresses"
ON customer_addresses FOR ALL TO authenticated USING (customer_id = auth.uid());

CREATE POLICY "Staff can view all addresses"
ON customer_addresses FOR SELECT TO authenticated USING (is_staff());

-- Promotions Policies
CREATE POLICY "Anyone can view active promotions"
ON promotions FOR SELECT USING (is_active = true OR is_staff());

CREATE POLICY "Staff can manage promotions"
ON promotions FOR ALL TO authenticated USING (is_staff());

-- Orders Policies
CREATE POLICY "Customers can view their own orders"
ON orders FOR SELECT TO authenticated USING (customer_id = auth.uid() OR is_staff());

CREATE POLICY "Customers can create orders"
ON orders FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can cancel their pending orders"
ON orders FOR UPDATE TO authenticated USING (customer_id = auth.uid() AND status = 'pending');

CREATE POLICY "Staff can update any order"
ON orders FOR UPDATE TO authenticated USING (is_staff());

-- Order Items Policies
CREATE POLICY "Users can view items in their orders"
ON order_items FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM orders
        WHERE orders.id = order_items.order_id
        AND (orders.customer_id = auth.uid() OR is_staff())
    )
);

CREATE POLICY "Customers can insert items to their own orders"
ON order_items FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM orders
        WHERE orders.id = order_items.order_id
        AND orders.customer_id = auth.uid()
    )
);

-- Prescriptions Policies (HIGH SECURITY: Private medical records)
CREATE POLICY "Customers can view their own prescriptions"
ON prescriptions FOR SELECT TO authenticated USING (customer_id = auth.uid() OR is_staff());

CREATE POLICY "Customers can upload prescriptions"
ON prescriptions FOR INSERT TO authenticated WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Customers can update their own prescriptions if needs revision"
ON prescriptions FOR UPDATE TO authenticated USING (customer_id = auth.uid() AND status = 'needs_revision');

CREATE POLICY "Pharmacists and Admin can review and update prescriptions"
ON prescriptions FOR UPDATE TO authenticated USING (is_staff());

-- Conversations Policies
CREATE POLICY "Customers can view and create their own conversations"
ON conversations FOR ALL TO authenticated USING (customer_id = auth.uid() OR is_staff());

-- Messages Policies
CREATE POLICY "Participants and Staff can view messages"
ON messages FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM conversations
        WHERE conversations.id = messages.conversation_id
        AND (conversations.customer_id = auth.uid() OR is_staff())
    )
);

CREATE POLICY "Participants and Staff can insert messages"
ON messages FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM conversations
        WHERE conversations.id = messages.conversation_id
        AND (conversations.customer_id = auth.uid() OR is_staff())
    )
);

-- Store Settings Policies
CREATE POLICY "Anyone can view store settings"
ON store_settings FOR SELECT USING (true);

CREATE POLICY "Admin can update store settings"
ON store_settings FOR ALL TO authenticated USING (is_admin());

-- ==============================================================================
-- STORAGE BUCKETS CONFIGURATION (To be created via Supabase dashboard / API)
-- ==============================================================================
-- Buckets:
-- 1. 'products' (Public bucket for product catalog images)
-- 2. 'store-assets' (Public bucket for logos, QRIS codes, banners)
-- 3. 'prescriptions' (PRIVATE bucket for confidential medical prescriptions)
-- 4. 'payment-proofs' (PRIVATE bucket for customer transfer slips)
