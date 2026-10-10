import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { mockPromotions } from '@/lib/data/mock-data';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    if (isSupabaseConfigured()) {
      const supabase = await getSupabaseAdminClient();
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase promotions fetch error:', error);
      } else if (data) {
        return NextResponse.json({
          success: true,
          data,
          source: 'supabase',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: mockPromotions,
      source: 'local_fallback',
    });
  } catch (err: any) {
    console.error('Promotions GET error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memuat promo' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, title, description, discount_type, discount_value, min_order_amount } = body;

    if (!code || !title) {
      return NextResponse.json(
        { success: false, error: 'Kode promo dan judul wajib diisi' },
        { status: 400 }
      );
    }

    const newPromo = {
      code: code.trim().toUpperCase(),
      title: title.trim(),
      description: description || '',
      discount_type: discount_type || 'fixed',
      discount_value: Number(discount_value) || 10000,
      min_order_amount: Number(min_order_amount) || 50000,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      const supabase = await getSupabaseAdminClient();
      const { data, error } = await supabase.from('promotions').insert([newPromo]).select().single();
      if (error) {
        return NextResponse.json(
          { success: false, error: error.message || 'Gagal menyimpan promo ke Supabase' },
          { status: 500 }
        );
      }
      return NextResponse.json({
        success: true,
        data,
        message: 'Promo voucher berhasil disimpan di Supabase',
      });
    }

    return NextResponse.json({
      success: true,
      data: newPromo,
      message: 'Promo voucher berhasil dibuat',
    });
  } catch (err: any) {
    console.error('Promotions POST error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal menyimpan promo' },
      { status: 500 }
    );
  }
}

