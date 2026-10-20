import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  Pragma: 'no-cache',
  Expires: '0',
};

const DEFAULT_OPENING_MESSAGE =
  'Halo! Selamat datang di Meja Konsultasi Apotek Jabat. Saya apt. Siti Rahma, S.Farm. Apakah ada keluhan kesehatan, aturan pakai obat, atau resep dokter yang ingin Anda tanyakan?';

// Default rules fallback (always ready even if migration hasn't been run yet)
let inMemoryAutoReplyConfig = {
  enabled: true,
  fallback_enabled: false,
  fallback_message:
    'Baik Kak, terima kasih sudah berkonsultasi dengan Apotek Jabat. Apabila keluhan berlanjut lebih dari 3 hari atau bertambah berat, segera konsultasikan langsung ke dokter ya.',
  opening_message: DEFAULT_OPENING_MESSAGE,
  rules: [
    {
      id: 'rule-paracetamol',
      keywords: ['paracetamol', 'demam', 'panas'],
      reply_message:
        'Untuk Paracetamol diminum 1 tablet saat demam atau nyeri, beri jeda minimal 4–6 jam antar dosis ya Kak. Jangan diminum saat perut kosong jika ada riwayat maag.',
      recommended_product_id: 'a1000000-0000-0000-0000-000000000001',
      is_active: true,
    },
    {
      id: 'rule-resep',
      keywords: ['resep', 'tebus resep', 'dokter'],
      reply_message:
        'Silakan unggah foto resep dokter Anda melalui menu Keranjang / Checkout tebus resep. Apoteker kami akan segera memverifikasi ketersediaan stok, aturan pakai, dan dosisnya.',
      recommended_product_id: null,
      is_active: true,
    },
    {
      id: 'rule-vitamin',
      keywords: ['vitamin', 'imun', 'daya tahan', 'suplemen'],
      reply_message:
        'Untuk menjaga daya tahan tubuh dan imunitas harian, Enervon-C sangat baik dikonsumsi 1x sehari di pagi hari setelah sarapan.',
      recommended_product_id: 'a1000000-0000-0000-0000-000000000005',
      is_active: true,
    },
    {
      id: 'rule-masuk-angin',
      keywords: ['masuk angin', 'flu', 'kembung', 'meriang'],
      reply_message:
        'Untuk meredakan meriang, kembung, dan masuk angin, Anda dapat meminum Tolak Angin cair 1 sachet sesudah makan atau sebelum tidur malam.',
      recommended_product_id: '2e54076d-d1c7-459f-a59a-b20d1e28642b',
      is_active: true,
    },
  ],
};

export async function GET(request: Request) {
  try {
    if (isSupabaseConfigured()) {
      try {
        const supabase = await getSupabaseAdminClient(request);

        // Try reading config from Supabase
        const { data: configRow } = await supabase
          .from('chat_auto_reply_config')
          .select('*')
          .eq('id', 'global')
          .maybeSingle();

        // Try reading opening message from Supabase
        const { data: openingRow } = await supabase
          .from('chat_auto_replies')
          .select('reply_message')
          .eq('id', '__config_opening_message__')
          .maybeSingle();

        const currentOpeningMessage =
          openingRow?.reply_message?.trim() || inMemoryAutoReplyConfig.opening_message;

        // Try reading rules from Supabase (excluding opening message)
        const { data: rulesRows, error: rulesErr } = await supabase
          .from('chat_auto_replies')
          .select('*, product:products!recommended_product_id (*, variants:product_variants(*))')
          .neq('id', '__config_opening_message__')
          .order('created_at', { ascending: true });

        const rulesList =
          !rulesErr && rulesRows && rulesRows.length > 0
            ? rulesRows.map((r: any) => ({
                id: r.id,
                keywords: Array.isArray(r.keywords) ? r.keywords : [],
                reply_message: r.reply_message,
                recommended_product_id: r.recommended_product_id,
                recommended_product: r.product || undefined,
                is_active: r.is_active ?? true,
              }))
            : inMemoryAutoReplyConfig.rules;

        return NextResponse.json(
          {
            success: true,
            data: {
              enabled: configRow ? Boolean(configRow.enabled) : inMemoryAutoReplyConfig.enabled,
              fallback_enabled:
                configRow && configRow.fallback_enabled !== undefined
                  ? Boolean(configRow.fallback_enabled)
                  : inMemoryAutoReplyConfig.fallback_enabled,
              fallback_message: configRow
                ? configRow.fallback_message
                : inMemoryAutoReplyConfig.fallback_message,
              opening_message: currentOpeningMessage,
              rules: rulesList,
            },
          },
          { headers: noCacheHeaders }
        );
      } catch (dbErr) {
        // Silently fallback to in-memory config if table not yet created
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: inMemoryAutoReplyConfig,
      },
      { headers: noCacheHeaders }
    );
  } catch (err: any) {
    console.error('GET /api/chat/auto-replies error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memuat pengaturan balasan otomatis.' },
      { status: 500, headers: noCacheHeaders }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { enabled, fallback_enabled, fallback_message, opening_message, rules } = body;

    if (enabled !== undefined) {
      inMemoryAutoReplyConfig.enabled = Boolean(enabled);
    }
    if (fallback_enabled !== undefined) {
      inMemoryAutoReplyConfig.fallback_enabled = Boolean(fallback_enabled);
    }
    if (typeof fallback_message === 'string') {
      inMemoryAutoReplyConfig.fallback_message = fallback_message.trim();
    }
    if (typeof opening_message === 'string' && opening_message.trim()) {
      inMemoryAutoReplyConfig.opening_message = opening_message.trim();
    }
    if (Array.isArray(rules)) {
      inMemoryAutoReplyConfig.rules = rules.map((r: any, idx: number) => ({
        id: r.id || `rule-${Date.now()}-${idx}`,
        keywords: Array.isArray(r.keywords)
          ? r.keywords.map((k: string) => k.toLowerCase().trim()).filter(Boolean)
          : String(r.keywords || '')
              .split(',')
              .map((k: string) => k.toLowerCase().trim())
              .filter(Boolean),
        reply_message: String(r.reply_message || '').trim(),
        recommended_product_id: r.recommended_product_id || null,
        is_active: r.is_active !== false,
      }));
    }

    // Persist to Supabase if table exists
    if (isSupabaseConfigured()) {
      try {
        const supabase = await getSupabaseAdminClient(request);

        // Upsert config with fallback_enabled
        await supabase
          .from('chat_auto_reply_config')
          .upsert({
            id: 'global',
            enabled: inMemoryAutoReplyConfig.enabled,
            fallback_enabled: inMemoryAutoReplyConfig.fallback_enabled,
            fallback_message: inMemoryAutoReplyConfig.fallback_message,
            updated_at: new Date().toISOString(),
          });

        // Upsert opening message row
        if (inMemoryAutoReplyConfig.opening_message) {
          await supabase
            .from('chat_auto_replies')
            .upsert({
              id: '__config_opening_message__',
              keywords: ['__system_opening__'],
              reply_message: inMemoryAutoReplyConfig.opening_message,
              recommended_product_id: null,
              is_active: true,
              updated_at: new Date().toISOString(),
            });
        }

        // Replace rules in database (preserve opening message)
        if (Array.isArray(rules)) {
          // Clear previous rules except opening message and re-insert
          await supabase
            .from('chat_auto_replies')
            .delete()
            .neq('id', '__config_opening_message__');

          const rowsToInsert = inMemoryAutoReplyConfig.rules.map((r) => ({
            id: r.id,
            keywords: r.keywords,
            reply_message: r.reply_message,
            recommended_product_id: r.recommended_product_id || null,
            is_active: r.is_active,
            updated_at: new Date().toISOString(),
          }));

          if (rowsToInsert.length > 0) {
            await supabase.from('chat_auto_replies').insert(rowsToInsert);
          }
        }
      } catch (dbErr) {
        console.warn('Supabase auto replies sync notice:', dbErr);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Pengaturan pesan pembuka & balasan otomatis berhasil disimpan.',
        data: inMemoryAutoReplyConfig,
      },
      { headers: noCacheHeaders }
    );
  } catch (err: any) {
    console.error('POST /api/chat/auto-replies error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal menyimpan pengaturan.' },
      { status: 500, headers: noCacheHeaders }
    );
  }
}
