import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { mockStoreSettings } from '@/lib/data/mock-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        return NextResponse.json({
          success: true,
          data,
          source: 'supabase',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: mockStoreSettings,
      source: 'local_fallback',
    });
  } catch (err: any) {
    console.error('Store GET error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memuat info toko' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    if (isSupabaseConfigured()) {
      const { data: existing } = await supabase.from('store_settings').select('id').limit(1).maybeSingle();
      
      let res;
      if (existing?.id) {
        res = await supabase.from('store_settings').update({
          ...body,
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id).select().single();
      } else {
        res = await supabase.from('store_settings').insert([body]).select().single();
      }

      if (res.data && !res.error) {
        return NextResponse.json({
          success: true,
          data: res.data,
          message: 'Pengaturan apotek berhasil disimpan di Supabase',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: body,
      message: 'Pengaturan apotek berhasil diperbarui',
    });
  } catch (err: any) {
    console.error('Store PUT error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memperbarui info toko' },
      { status: 500 }
    );
  }
}
