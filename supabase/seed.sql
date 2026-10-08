-- ==============================================================================
-- APOTEK SEHAT MANDIRI - SEED DATA FOR PRODUCTION / DEV
-- ==============================================================================

-- 1. Store Settings
INSERT INTO store_settings (
    id,
    store_name,
    tagline,
    branch_name,
    address,
    phone,
    whatsapp,
    email,
    pharmacist_name,
    pharmacist_sipa,
    is_open,
    opening_time,
    closing_time,
    express_delivery_fee,
    regular_delivery_fee,
    free_delivery_threshold,
    bank_name,
    bank_account_number,
    bank_account_holder,
    qris_enabled,
    cod_enabled
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Apotek Sehat Mandiri',
    'Farmasi Digital Resmi & Terpercaya',
    'Tebet Barat, Jakarta Selatan',
    'Jl. Tebet Barat Dalam Raya No. 42, RT.05/RW.02, Tebet Barat, Jakarta Selatan, DKI Jakarta 12810',
    '0812-3456-7890',
    '6281234567890',
    'layanan@apoteksehatmandiri.com',
    'apt. Siti Rahma, S.Farm.',
    '19870412/SIPA-31.74/2021/2048',
    TRUE,
    '08:00',
    '21:00',
    10000,
    15000,
    100000,
    'Bank Central Asia (BCA)',
    '8830-1928-4411',
    'Apotek Sehat Mandiri',
    TRUE,
    TRUE
) ON CONFLICT (id) DO NOTHING;

-- 2. Categories
INSERT INTO categories (id, name, slug, description, icon, display_order) VALUES
('c1000000-0000-0000-0000-000000000001', 'Obat Bebas', 'obat-bebas', 'Obat yang dapat dibeli tanpa resep dokter dengan tanda lingkaran hijau', 'pill', 1),
('c1000000-0000-0000-0000-000000000002', 'Perawatan Diri', 'perawatan-diri', 'Produk kesehatan kulit, tubuh, dan kebersihan diri', 'sparkles', 2),
('c1000000-0000-0000-0000-000000000003', 'Vitamin & Suplemen', 'vitamin-suplemen', 'Suplemen daya tahan tubuh, multivitamin harian & mineral', 'activity', 3),
('c1000000-0000-0000-0000-000000000004', 'Ibu & Anak', 'ibu-dan-anak', 'Kebutuhan nutrisi ibu hamil, menyusui, dan kesehatan anak', 'heart', 4),
('c1000000-0000-0000-0000-000000000005', 'Alat Kesehatan', 'alat-kesehatan', 'Termometer, tensimeter, plester luka, dan perlengkapan medis P3K', 'stethoscope', 5),
('c1000000-0000-0000-0000-000000000006', 'Promo Spesial', 'promo-spesial', 'Penawaran diskon hemat farmasi hemat s/d 50%', 'tag', 6)
ON CONFLICT (id) DO NOTHING;

-- 3. Promotions
INSERT INTO promotions (id, code, title, description, discount_type, discount_value, min_order_amount, max_discount, is_active) VALUES
('p1000000-0000-0000-0000-000000000001', 'HEMATSEHAT', 'Diskon Spesial Apotek Sehat Mandiri', 'Potongan langsung Rp 10.000 untuk belanja min. Rp 50.000', 'fixed', 10000, 50000, 10000, TRUE),
('p1000000-0000-0000-0000-000000000002', 'GRATISONGKIR', 'Gratis Ongkir Instan Tebet', 'Bebas biaya kirim khusus area Tebet & sekitarnya min. Rp 100.000', 'fixed', 10000, 100000, 10000, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 4. Products & Variants (Matching Stitch Design)

-- Product 1: Paracetamol 500mg
INSERT INTO products (
    id, name, slug, description, category_id, requires_prescription, is_active, is_featured,
    bpom_number, manufacturer, indications, composition, dosage, precautions, image_url
) VALUES (
    'a1000000-0000-0000-0000-000000000001',
    'Paracetamol 500mg Strip (10 Tablet)',
    'paracetamol-500mg',
    'Meredakan sakit kepala, sakit gigi, nyeri otot ringan hingga sedang, dismenore, serta efektif menurunkan demam yang menyertai flu atau pasca-imunisasi.',
    'c1000000-0000-0000-0000-000000000001',
    FALSE,
    TRUE,
    TRUE,
    'DBL8504104210A1',
    'Kimia Farma',
    'Meredakan sakit kepala, sakit gigi, nyeri otot, dan menurunkan demam.',
    'Tiap tablet mengandung Paracetamol 500 mg.',
    'Dewasa: 1-2 tablet 3-4 kali sehari (maksimal 8 tablet sehari). Anak 6-12 tahun: 1/2 - 1 tablet 3-4 kali sehari.',
    'Hati-hati penggunaan pada pasien dengan gangguan fungsi ginjal atau hati. Jangan melebihi dosis yang dianjurkan.',
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO product_variants (id, product_id, name, unit, quantity_per_package, price, strike_price, discount_percentage, stock) VALUES
('v1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Tablet', 'tablet', 1, 1500, 1800, 16, 250),
('v1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'Strip', 'tablet', 10, 15000, 18000, 17, 42),
('v1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'Box', 'strip', 10, 140000, 175000, 20, 15)
ON CONFLICT (id) DO NOTHING;

-- Product 2: Amoxicillin 500mg Kaplet (Requires Prescription)
INSERT INTO products (
    id, name, slug, description, category_id, requires_prescription, is_active, is_featured,
    bpom_number, manufacturer, indications, composition, dosage, precautions, image_url
) VALUES (
    'a1000000-0000-0000-0000-000000000002',
    'Amoxicillin 500mg Kaplet',
    'amoxicillin-500mg',
    'Antibiotik spektrum luas turunan penisilin untuk mengatasi infeksi bakteri pada saluran pernafasan, saluran kemih, kulit, dan jaringan lunak.',
    'c1000000-0000-0000-0000-000000000001',
    TRUE,
    TRUE,
    TRUE,
    'GKL9804212504A1',
    'Indofarma',
    'Infeksi bakteri peka amoksisilin pada saluran pernapasan, telinga, hidung, tenggorokan, dan saluran kemih.',
    'Tiap kaplet mengandung Amoxicillin Trihydrate setara Amoxicillin anhidrat 500 mg.',
    'Dewasa: 250 mg - 500 mg tiap 8 jam. Harus dihabiskan sesuai anjuran resep dokter.',
    'WAJIB DENGAN RESEP DOKTER. Kontraindikasi pada pasien dengan riwayat hipersensitivitas terhadap penisilin.',
    'https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=600&auto=format&fit=crop&q=80'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO product_variants (id, product_id, name, unit, quantity_per_package, price, strike_price, discount_percentage, stock) VALUES
('v2000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 'Strip', 'kaplet', 10, 25000, 29000, 14, 30),
('v2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'Box', 'kaplet', 100, 225000, 260000, 13, 8)
ON CONFLICT (id) DO NOTHING;

-- Product 3: OBH Tropica Plus Herbal Batuk 100ml
INSERT INTO products (
    id, name, slug, description, category_id, requires_prescription, is_active, is_featured,
    bpom_number, manufacturer, indications, composition, dosage, precautions, image_url
) VALUES (
    'a1000000-0000-0000-0000-000000000003',
    'OBH Tropica Plus Herbal Batuk 100ml',
    'obh-tropica-plus-100ml',
    'Obat batuk hitam herbal dengan ekstrak Succus Liquiritiae dan Madu murni untuk meredakan batuk berdahak, melegakan tenggorokan gatal dan suara serak.',
    'c1000000-0000-0000-0000-000000000001',
    FALSE,
    TRUE,
    TRUE,
    'TR142681991',
    'Tropica Mas',
    'Meredakan batuk berdahak, mengencerkan lendir, dan melegakan tenggorokan.',
    'Succus Liquiritiae 150 mg, Madu murni 500 mg, Ekstrak Jahe 100 mg, Ekstrak Mint 50 mg.',
    'Dewasa: 1 sendok takar (15 ml) 3 kali sehari sesudah makan. Anak 6-12 th: 1/2 sendok takar 3 kali sehari.',
    'Kocok dahulu sebelum diminum. Simpan di tempat sejuk dan kering terhindar dari panas.',
    'https://images.unsplash.com/photo-1550572017-ed200f5e6343?w=600&auto=format&fit=crop&q=80'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO product_variants (id, product_id, name, unit, quantity_per_package, price, strike_price, discount_percentage, stock) VALUES
('v3000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 'Botol', 'ml', 100, 28500, 32000, 11, 28)
ON CONFLICT (id) DO NOTHING;

-- Product 4: Antasida Doen Tablet Kunyah
INSERT INTO products (
    id, name, slug, description, category_id, requires_prescription, is_active, is_featured,
    bpom_number, manufacturer, indications, composition, dosage, precautions, image_url
) VALUES (
    'a1000000-0000-0000-0000-000000000004',
    'Antasida Doen Tablet Kunyah',
    'antasida-doen-tablet-kunyah',
    'Kombinasi Aluminium Hidroksida & Magnesium Hidroksida untuk menetralkan asam lambung berlebih, meredakan gejala maag, perut kembung, mual, dan rasa panas di dada (heartburn).',
    'c1000000-0000-0000-0000-000000000001',
    FALSE,
    TRUE,
    TRUE,
    'GBL7806308610A1',
    'Kimia Farma',
    'Mengurangi gejala yang berhubungan dengan kelebihan asam lambung, gastritis, tukak lambung.',
    'Aluminium Hidroksida 200 mg, Magnesium Hidroksida 200 mg.',
    'Dewasa: 1-2 tablet dikunyah 3-4 kali sehari 1 jam sebelum makan atau 2 jam sesudah makan dan menjelang tidur.',
    'Tablet harus dikunyah dengan baik sebelum ditelan.',
    'https://images.unsplash.com/photo-1577401239170-897942555fb3?w=600&auto=format&fit=crop&q=80'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO product_variants (id, product_id, name, unit, quantity_per_package, price, strike_price, discount_percentage, stock) VALUES
('v4000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000004', 'Strip', 'tablet kunyah', 10, 9500, 12000, 21, 60),
('v4000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000004', 'Box', 'tablet kunyah', 100, 85000, 110000, 23, 12)
ON CONFLICT (id) DO NOTHING;

-- Product 5: Enervon-C Multivitamin Strip
INSERT INTO products (
    id, name, slug, description, category_id, requires_prescription, is_active, is_featured,
    bpom_number, manufacturer, indications, composition, dosage, precautions, image_url
) VALUES (
    'a1000000-0000-0000-0000-000000000005',
    'Enervon-C Multivitamin Strip',
    'enervon-c-multivitamin',
    'Kombinasi Vitamin C dosis harian 500mg dan Vitamin B Kompleks untuk menjaga imunitas tubuh, mempercepat pemulihan pasca sakit, dan menjaga stamina tubuh agar tetap fit sepanjang hari.',
    'c1000000-0000-0000-0000-000000000003',
    FALSE,
    TRUE,
    TRUE,
    'SD011500881',
    'Darya-Varia',
    'Membantu memelihara daya tahan tubuh dan memulihkan kondisi setelah sakit.',
    'Vitamin C 500 mg, Vitamin B1 50 mg, Vitamin B2 25 mg, Vitamin B6 10 mg, Vitamin B12 5 mcg, Kalsium Pantotenat 20 mg, Niasinamida 50 mg.',
    '1 tablet salut selaput sehari sesudah makan.',
    'Simpan di bawah suhu 30°C di tempat kering.',
    'https://images.unsplash.com/photo-1584017911766-d451b3d0e843?w=600&auto=format&fit=crop&q=80'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO product_variants (id, product_id, name, unit, quantity_per_package, price, strike_price, discount_percentage, stock) VALUES
('v5000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000005', 'Strip', 'tablet', 4, 6500, 8000, 19, 85),
('v5000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000005', 'Strip Besar', 'tablet', 12, 18000, 22000, 18, 50),
('v5000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000005', 'Botol', 'tablet', 30, 42000, 50000, 16, 20)
ON CONFLICT (id) DO NOTHING;

-- Product 6: Oralit 200 Sachet Pengganti Cairan
INSERT INTO products (
    id, name, slug, description, category_id, requires_prescription, is_active, is_featured,
    bpom_number, manufacturer, indications, composition, dosage, precautions, image_url
) VALUES (
    'a1000000-0000-0000-0000-000000000006',
    'Oralit 200 Sachet Pengganti Cairan',
    'oralit-200-sachet',
    'Larutan rehidrasi oral untuk mencegah dan mengatasi dehidrasi akibat diare dan muntah-muntah pada anak maupun dewasa.',
    'c1000000-0000-0000-0000-000000000001',
    FALSE,
    TRUE,
    TRUE,
    'GBL9804212923A1',
    'Phapros',
    'Mencegah dan mengobati dehidrasi akibat diare atau muntah.',
    'NaCl 0.52 g, KCl 0.3 g, Trisodium Citrate Dihydrate 0.58 g, Glucose Anhydrous 2.7 g per sachet.',
    'Larutkan 1 sachet ke dalam 200 ml air matang. Diberikan setiap kali buang air besar atau muntah.',
    'Gunakan air matang yang sudah dingin. Jangan direbus setelah dilarutkan.',
    'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=600&auto=format&fit=crop&q=80'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO product_variants (id, product_id, name, unit, quantity_per_package, price, strike_price, discount_percentage, stock) VALUES
('v6000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000006', 'Sachet', 'gram', 4, 4500, 5500, 18, 120),
('v6000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000006', 'Box', 'sachet', 25, 25000, 30000, 17, 30)
ON CONFLICT (id) DO NOTHING;

-- Product 7: Betadine Antiseptic Solution 30ml
INSERT INTO products (
    id, name, slug, description, category_id, requires_prescription, is_active, is_featured,
    bpom_number, manufacturer, indications, composition, dosage, precautions, image_url
) VALUES (
    'a1000000-0000-0000-0000-000000000007',
    'Betadine Antiseptic Solution 30ml',
    'betadine-antiseptic-30ml',
    'Antiseptik luka dengan Povidone Iodine 10% untuk membunuh kuman penyebab infeksi pada luka iris, luka lecet, dan luka bakar ringan.',
    'c1000000-0000-0000-0000-000000000005',
    FALSE,
    TRUE,
    FALSE,
    'PKL20501710123',
    'Mundipharma',
    'Mencegah dan mengobati infeksi pada berbagai luka seperti luka lecet, gores, dan sayat.',
    'Povidone Iodine 10% w/v setara dengan Iodium 1%.',
    'Oleskan pada luka secukupnya 2-3 kali sehari.',
    'Hanya untuk pemakaian luar. Hati-hati pada penderita alergi iodium.',
    'https://images.unsplash.com/photo-1628771065518-0d82f1938462?w=600&auto=format&fit=crop&q=80'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO product_variants (id, product_id, name, unit, quantity_per_package, price, strike_price, discount_percentage, stock) VALUES
('v7000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000007', 'Botol', 'ml', 30, 24000, 26000, 8, 35)
ON CONFLICT (id) DO NOTHING;

-- Product 8: Termometer Digital Fleksibel
INSERT INTO products (
    id, name, slug, description, category_id, requires_prescription, is_active, is_featured,
    bpom_number, manufacturer, indications, composition, dosage, precautions, image_url
) VALUES (
    'a1000000-0000-0000-0000-000000000008',
    'Termometer Digital Fleksibel',
    'termometer-digital-fleksibel',
    'Pengukur suhu tubuh digital dengan ujung elastis lembut, hasil akurat dan cepat dalam 10-30 detik dengan bunyi alarm otomatis.',
    'c1000000-0000-0000-0000-000000000005',
    FALSE,
    TRUE,
    TRUE,
    'AKL20901810502',
    'Omron Healthcare',
    'Alat ukur suhu tubuh digital untuk ketiak, oral, dan rektal.',
    'Alat Medis Digital bergaransi 1 tahun.',
    'Gunakan pada ketiak atau rongga mulut sampai terdengar bunyi bip.',
    'Bersihkan ujung probe dengan alkohol 70% sebelum dan sesudah digunakan.',
    'https://images.unsplash.com/photo-1584362917165-526a968579e8?w=600&auto=format&fit=crop&q=80'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO product_variants (id, product_id, name, unit, quantity_per_package, price, strike_price, discount_percentage, stock) VALUES
('v8000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000008', 'Unit', 'buah', 1, 35000, 45000, 22, 18)
ON CONFLICT (id) DO NOTHING;

-- Product 9: Hansaplast Plester Luka
INSERT INTO products (
    id, name, slug, description, category_id, requires_prescription, is_active, is_featured,
    bpom_number, manufacturer, indications, composition, dosage, precautions, image_url
) VALUES (
    'a1000000-0000-0000-0000-000000000009',
    'Hansaplast Plester Luka',
    'hansaplast-plester-luka',
    'Plester kain elastis dengan bantalan luka yang tidak lengket untuk melindungi luka dari kotoran dan bakteri.',
    'c1000000-0000-0000-0000-000000000005',
    FALSE,
    TRUE,
    FALSE,
    'AKL10902812903',
    'Beiersdorf',
    'Perlindungan luka sayat, lecet, dan goresan ringan.',
    'Plester elastis higienis berbahan katun berpori.',
    'Bersihkan luka dan tempelkan plester. Ganti secara berkala.',
    'Ganti plester setidaknya 1 kali sehari atau bila basah.',
    'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=600&auto=format&fit=crop&q=80'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO product_variants (id, product_id, name, unit, quantity_per_package, price, strike_price, discount_percentage, stock) VALUES
('v9000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000009', 'Amplop (10 Lembar)', 'lembar', 10, 8000, 9500, 16, 75)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- 5. SEED USERS & PROFILES FOR ALL ROLES (Customer, Pharmacist, Admin)
-- Password for all accounts: Password123!
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean up any existing stale or broken records for seed users
DELETE FROM auth.identities WHERE user_id IN ('ef729fc0-54a1-4091-b083-51d1d0ce44b1', 'ef729fc0-54a1-4091-b083-51d1d0ce44b2', 'ef729fc0-54a1-4091-b083-51d1d0ce44b3');
DELETE FROM public.profiles WHERE id IN ('ef729fc0-54a1-4091-b083-51d1d0ce44b1', 'ef729fc0-54a1-4091-b083-51d1d0ce44b2', 'ef729fc0-54a1-4091-b083-51d1d0ce44b3') OR email IN ('admin@jabat.id', 'apoteker@jabat.id', 'pasien@jabat.id');
DELETE FROM auth.users WHERE id IN ('ef729fc0-54a1-4091-b083-51d1d0ce44b1', 'ef729fc0-54a1-4091-b083-51d1d0ce44b2', 'ef729fc0-54a1-4091-b083-51d1d0ce44b3') OR email IN ('admin@jabat.id', 'apoteker@jabat.id', 'pasien@jabat.id');

-- Insert into auth.users (Supabase GoTrue Auth Table)
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user,
    deleted_at,
    is_anonymous
) VALUES
-- 1. Customer User
(
    '00000000-0000-0000-0000-000000000000',
    'ef729fc0-54a1-4091-b083-51d1d0ce44b1',
    'authenticated',
    'authenticated',
    'pasien@jabat.id',
    crypt('Password123!', gen_salt('bf')),
    NOW(),
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Budi Santoso","phone":"081234567890","role":"customer"}'::jsonb,
    FALSE,
    NOW(),
    NOW(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL,
    FALSE,
    NULL,
    FALSE
),
-- 2. Pharmacist User (Apoteker PJ)
(
    '00000000-0000-0000-0000-000000000000',
    'ef729fc0-54a1-4091-b083-51d1d0ce44b2',
    'authenticated',
    'authenticated',
    'apoteker@jabat.id',
    crypt('Password123!', gen_salt('bf')),
    NOW(),
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"apt. Siti Rahma, S.Farm.","phone":"081298765432","role":"pharmacist","sipa_number":"19870412/SIPA-31.74/2021/2048"}'::jsonb,
    FALSE,
    NOW(),
    NOW(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL,
    FALSE,
    NULL,
    FALSE
),
-- 3. Admin User
(
    '00000000-0000-0000-0000-000000000000',
    'ef729fc0-54a1-4091-b083-51d1d0ce44b3',
    'authenticated',
    'authenticated',
    'admin@jabat.id',
    crypt('Password123!', gen_salt('bf')),
    NOW(),
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Administrator Apotek Jabat","phone":"081122334455","role":"admin"}'::jsonb,
    FALSE,
    NOW(),
    NOW(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL,
    FALSE,
    NULL,
    FALSE
)
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    email_confirmed_at = NOW(),
    updated_at = NOW();

-- Insert into auth.identities (Required by GoTrue Auth for sign-in queries)
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
) VALUES
(
    'ef729fc0-54a1-4091-b083-51d1d0ce44b1',
    'ef729fc0-54a1-4091-b083-51d1d0ce44b1',
    jsonb_build_object('sub', 'ef729fc0-54a1-4091-b083-51d1d0ce44b1', 'email', 'pasien@jabat.id'),
    'email',
    'ef729fc0-54a1-4091-b083-51d1d0ce44b1',
    NOW(),
    NOW(),
    NOW()
),
(
    'ef729fc0-54a1-4091-b083-51d1d0ce44b2',
    'ef729fc0-54a1-4091-b083-51d1d0ce44b2',
    jsonb_build_object('sub', 'ef729fc0-54a1-4091-b083-51d1d0ce44b2', 'email', 'apoteker@jabat.id'),
    'email',
    'ef729fc0-54a1-4091-b083-51d1d0ce44b2',
    NOW(),
    NOW(),
    NOW()
),
(
    'ef729fc0-54a1-4091-b083-51d1d0ce44b3',
    'ef729fc0-54a1-4091-b083-51d1d0ce44b3',
    jsonb_build_object('sub', 'ef729fc0-54a1-4091-b083-51d1d0ce44b3', 'email', 'admin@jabat.id'),
    'email',
    'ef729fc0-54a1-4091-b083-51d1d0ce44b3',
    NOW(),
    NOW(),
    NOW()
)
ON CONFLICT (provider, provider_id) DO UPDATE SET
    identity_data = EXCLUDED.identity_data,
    updated_at = NOW();

-- Insert into public.profiles (Application Profile Table)
INSERT INTO public.profiles (
    id,
    role,
    full_name,
    phone,
    avatar_url,
    sipa_number
) VALUES
-- Profile 1: Customer
(
    'ef729fc0-54a1-4091-b083-51d1d0ce44b1',
    'customer',
    'Budi Santoso',
    '081234567890',
    NULL,
    NULL
),
-- Profile 2: Pharmacist
(
    'ef729fc0-54a1-4091-b083-51d1d0ce44b2',
    'pharmacist',
    'apt. Siti Rahma, S.Farm.',
    '081298765432',
    NULL,
    '19870412/SIPA-31.74/2021/2048'
),
-- Profile 3: Admin
(
    'ef729fc0-54a1-4091-b083-51d1d0ce44b3',
    'admin',
    'Administrator Apotek Jabat',
    '081122334455',
    NULL,
    NULL
)
ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    sipa_number = EXCLUDED.sipa_number;

-- 6. Customer Address for Customer User (Budi Santoso)
INSERT INTO customer_addresses (
    id,
    customer_id,
    label,
    recipient_name,
    phone,
    address_line,
    subdistrict,
    district,
    city,
    postal_code,
    delivery_notes,
    is_primary
) VALUES (
    '204e621c-08d6-4086-8e13-30bf143efaf1',
    'ef729fc0-54a1-4091-b083-51d1d0ce44b1',
    'Rumah',
    'Budi Santoso',
    '081234567890',
    'Jl. Tebet Barat Dalam IV No. 12, RT.05/RW.02',
    'Tebet Barat',
    'Tebet',
    'Jakarta Selatan',
    '12810',
    'Mohon sertakan plastik klip kedap udara dan titipkan di pos sekuriti jika sedang tidak ada orang.',
    TRUE
) ON CONFLICT (id) DO NOTHING;

-- 7. Sample Chat Consultation
INSERT INTO conversations (
    id,
    customer_id,
    assigned_pharmacist_id,
    status,
    last_message_at
) VALUES (
    '204e621c-08d6-4086-8e13-30bf143efaf1',
    'ef729fc0-54a1-4091-b083-51d1d0ce44b1',
    'ef729fc0-54a1-4091-b083-51d1d0ce44b2',
    'open',
    NOW()
) ON CONFLICT (id) DO NOTHING;

INSERT INTO messages (
    id,
    conversation_id,
    sender_id,
    message,
    is_read,
    created_at
) VALUES
(
    '204e621c-08d6-4086-8e13-30bf143efaf1',
    '204e621c-08d6-4086-8e13-30bf143efaf1',
    'ef729fc0-54a1-4091-b083-51d1d0ce44b1',
    'Halo Bu Apoteker, saya ingin konsultasi mengenai obat demam dan batuk untuk anak usia 8 tahun.',
    TRUE,
    NOW() - INTERVAL '10 minutes'
),
(
    '204e621c-08d6-4086-8e13-30bf143efaf2',
    '204e621c-08d6-4086-8e13-30bf143efaf1',
    'ef729fc0-54a1-4091-b083-51d1d0ce44b2',
    'Halo Pak Budi! Tentu, untuk anak 8 tahun bisa menggunakan Paracetamol 500mg dengan dosis 1/2 tablet 3-4 kali sehari setelah makan, atau OBH sirup herbal jika disertai batuk berdahak.',
    TRUE,
    NOW() - INTERVAL '5 minutes'
) ON CONFLICT (id) DO NOTHING;
