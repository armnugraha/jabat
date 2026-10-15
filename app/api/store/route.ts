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

      // Fetch registered pharmacists from profiles (Single Source of Truth)
      const { data: pharmacists } = await supabaseAnon
        .from('profiles')
        .select('id, full_name, sipa_number, phone, avatar_url, role')
        .eq('role', 'pharmacist')
        .order('created_at', { ascending: true });

      const activePharmacist =
        pharmacists?.find((p) => p.id === (data as any)?.pharmacist_id) ||
        pharmacists?.[0] ||
        null;

      if (data && !error) {
        const mergedData = {
          ...data,
          // Sync with profile single source of truth
          pharmacist_name: activePharmacist?.full_name || data.pharmacist_name || mockStoreSettings.pharmacist_name,
          pharmacist_sipa: activePharmacist?.sipa_number || data.pharmacist_sipa || mockStoreSettings.pharmacist_sipa,
          pharmacist_id: activePharmacist?.id || (data as any)?.pharmacist_id || null,
        };

        return NextResponse.json(
          {
            success: true,
            data: {
              ...formatStoreSettings(mergedData),
              available_pharmacists: pharmacists || [],
              active_pharmacist: activePharmacist,
            },
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
        data: {
          ...formatStoreSettings(mockStoreSettings),
          available_pharmacists: [
            {
              id: 'ef729fc0-54a1-4091-b083-51d1d0ce44b2',
              full_name: mockStoreSettings.pharmacist_name,
              sipa_number: mockStoreSettings.pharmacist_sipa,
              role: 'pharmacist',
            },
          ],
        },
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

    // Remove client-side extra fields before writing to store_settings table
    delete payload.available_pharmacists;
    delete payload.active_pharmacist;

    // Synchronize pharmacist name & SIPA from the assigned pharmacist profile
    if (payload.pharmacist_id) {
      const { data: pharm } = await supabase
        .from('profiles')
        .select('full_name, sipa_number')
        .eq('id', payload.pharmacist_id)
        .maybeSingle();
      if (pharm) {
        payload.pharmacist_name = pharm.full_name;
        payload.pharmacist_sipa = pharm.sipa_number || '';
      }
    } else {
      // Find current active pharmacist from profiles
      const { data: pharm } = await supabase
        .from('profiles')
        .select('id, full_name, sipa_number')
        .eq('role', 'pharmacist')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (pharm) {
        payload.pharmacist_name = pharm.full_name;
        payload.pharmacist_sipa = pharm.sipa_number || '';
      }
    }

    if (payload.qris_enabled && (!payload.qris_image_url || typeof payload.qris_image_url !== 'string' || !payload.qris_image_url.trim())) {
      return NextResponse.json(
        { success: false, error: 'Foto barcode QRIS wajib diunggah jika ingin mengaktifkan metode QRIS.' },
        { status: 400 }
      );
    }

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


