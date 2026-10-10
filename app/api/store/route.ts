import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { supabaseAnon, getSupabaseAdminClient } from '@/lib/supabase/server';
import { mockStoreSettings } from '@/lib/data/mock-data';
import { StoreSettings } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const isValidUUID = (id?: string) =>
  typeof id === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  'Surrogate-Control': 'no-store',
  Pragma: 'no-cache',
  Expires: '0',
};

function formatStoreSettings(data: any): StoreSettings {
  let bankAccounts: any[] = [];
  if (data?.bank_account_number) {
    try {
      if (typeof data.bank_account_number === 'string' && data.bank_account_number.trim().startsWith('[')) {
        bankAccounts = JSON.parse(data.bank_account_number);
      }
    } catch (e) {}
  }

  if (!Array.isArray(bankAccounts) || bankAccounts.length === 0) {
    if (data?.bank_account_number || data?.bank_name) {
      bankAccounts = [
        {
          id: 'acc-1',
          bank_name: data.bank_name || 'Bank Central Asia (BCA)',
          account_number: data.bank_account_number || '',
          account_holder: data.bank_account_holder || data.store_name || 'Apotek Jabat',
        },
      ];
    }
  }

  return {
    ...data,
    bank_accounts: bankAccounts,
    bank_name: bankAccounts[0]?.bank_name || data?.bank_name || '',
    bank_account_number: bankAccounts[0]?.account_number || data?.bank_account_number || '',
    bank_account_holder: bankAccounts[0]?.account_holder || data?.bank_account_holder || '',
  };
}

export async function GET() {
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabaseAnon
        .from('store_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        return NextResponse.json(
          {
            success: true,
            data: formatStoreSettings(data),
            source: 'supabase',
          },
          { headers: noCacheHeaders }
        );
      }

      if (error) {
        console.warn('Supabase store settings fetch error:', error);
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: formatStoreSettings(mockStoreSettings),
        source: 'fallback',
      },
      { headers: noCacheHeaders }
    );
  } catch (err: any) {
    console.error('Store GET error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memuat info toko' },
      { status: 500, headers: noCacheHeaders }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const updatedDate = new Date().toISOString();

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Koneksi Supabase belum terkonfigurasi' },
        { status: 500 }
      );
    }

    const supabase = await getSupabaseAdminClient();

    // Check existing store_settings record
    const { data: existing } = await supabase
      .from('store_settings')
      .select('id')
      .limit(1)
      .maybeSingle();

    const payload: Record<string, any> = {
      ...body,
      updated_at: updatedDate,
    };

    if (Array.isArray(payload.bank_accounts)) {
      payload.bank_account_number = JSON.stringify(payload.bank_accounts);
      payload.bank_name = payload.bank_accounts[0]?.bank_name || payload.bank_name || '';
      payload.bank_account_holder = payload.bank_accounts[0]?.account_holder || payload.bank_account_holder || '';
      delete payload.bank_accounts;
    }

    if (!isValidUUID(payload.id)) {
      delete payload.id;
    }

    let resultData = null;
    let resultError = null;

    if (existing?.id) {
      const res = await supabase
        .from('store_settings')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
      resultData = res.data;
      resultError = res.error;
    } else {
      const res = await supabase
        .from('store_settings')
        .insert([payload])
        .select()
        .single();
      resultData = res.data;
      resultError = res.error;
    }

    if (resultError) {
      console.error('Supabase store_settings update error:', resultError);
      return NextResponse.json(
        { success: false, error: resultError.message || 'Gagal menyimpan ke Supabase' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: formatStoreSettings(resultData),
      message: 'Pengaturan apotek berhasil disimpan di Supabase',
    });
  } catch (err: any) {
    console.error('Store PUT error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memperbarui info toko' },
      { status: 500 }
    );
  }
}


