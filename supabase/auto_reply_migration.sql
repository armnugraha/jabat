-- ==============================================================================
-- CHAT AUTO-REPLIES MIGRATION (JABAT - Supabase)
-- Jalankan script SQL ini di: Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

CREATE TABLE IF NOT EXISTS chat_auto_replies (
    id TEXT PRIMARY KEY,
    keywords TEXT[] NOT NULL DEFAULT '{}'::text[],
    reply_message TEXT NOT NULL,
    recommended_product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_auto_reply_config (
    id TEXT PRIMARY KEY DEFAULT 'global',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    fallback_message TEXT NOT NULL DEFAULT 'Baik Kak, terima kasih sudah berkonsultasi dengan Apotek Jabat. Apabila keluhan berlanjut lebih dari 3 hari atau bertambah berat, segera konsultasikan langsung ke dokter ya.',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE chat_auto_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_auto_reply_config ENABLE ROW LEVEL SECURITY;

-- Policies: anyone authenticated can read, staff can manage
DROP POLICY IF EXISTS "Anyone authenticated can read auto replies" ON chat_auto_replies;
CREATE POLICY "Anyone authenticated can read auto replies" ON chat_auto_replies
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can manage auto replies" ON chat_auto_replies;
CREATE POLICY "Staff can manage auto replies" ON chat_auto_replies
FOR ALL TO authenticated USING (is_staff()) WITH CHECK (is_staff());

DROP POLICY IF EXISTS "Anyone authenticated can read auto reply config" ON chat_auto_reply_config;
CREATE POLICY "Anyone authenticated can read auto reply config" ON chat_auto_reply_config
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Staff can manage auto reply config" ON chat_auto_reply_config;
CREATE POLICY "Staff can manage auto reply config" ON chat_auto_reply_config
FOR ALL TO authenticated USING (is_staff()) WITH CHECK (is_staff());

-- Insert default config
INSERT INTO chat_auto_reply_config (id, enabled, fallback_message)
VALUES ('global', TRUE, 'Baik Kak, terima kasih sudah berkonsultasi dengan Apotek Jabat. Apabila keluhan berlanjut lebih dari 3 hari atau bertambah berat, segera konsultasikan langsung ke dokter ya.')
ON CONFLICT (id) DO NOTHING;

-- Seed default rules
INSERT INTO chat_auto_replies (id, keywords, reply_message, recommended_product_id, is_active)
VALUES 
(
    'rule-paracetamol',
    ARRAY['paracetamol', 'demam', 'panas'],
    'Untuk Paracetamol diminum 1 tablet saat demam atau nyeri, beri jeda minimal 4–6 jam antar dosis ya Kak. Jangan diminum saat perut kosong jika ada riwayat maag.',
    'a1000000-0000-0000-0000-000000000001',
    TRUE
),
(
    'rule-resep',
    ARRAY['resep', 'tebus resep', 'dokter'],
    'Silakan unggah foto resep dokter Anda melalui menu Keranjang / Checkout tebus resep. Apoteker kami akan segera memverifikasi ketersediaan stok, aturan pakai, dan dosisnya.',
    NULL,
    TRUE
),
(
    'rule-vitamin',
    ARRAY['vitamin', 'imun', 'daya tahan', 'suplemen'],
    'Untuk menjaga daya tahan tubuh dan imunitas harian, Enervon-C sangat baik dikonsumsi 1x sehari di pagi hari setelah sarapan.',
    'a1000000-0000-0000-0000-000000000001',
    TRUE
),
(
    'rule-masuk-angin',
    ARRAY['masuk angin', 'flu', 'kembung', 'meriang'],
    'Untuk meredakan meriang, kembung, dan masuk angin, Anda dapat meminum Tolak Angin cair 1 sachet sesudah makan atau sebelum tidur malam.',
    '2e54076d-d1c7-459f-a59a-b20d1e28642b',
    TRUE
)
ON CONFLICT (id) DO NOTHING;
