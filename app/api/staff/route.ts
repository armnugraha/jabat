import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
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

// Known default emails for seeded staff accounts
const SEED_EMAILS: Record<string, string> = {
  'ef729fc0-54a1-4091-b083-51d1d0ce44b3': 'admin@jabat.id',
  'ef729fc0-54a1-4091-b083-51d1d0ce44b2': 'apoteker@jabat.id',
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get('role'); // 'all' | 'admin' | 'pharmacist'

    if (isSupabaseConfigured()) {
      const adminClient = await getSupabaseAdminClient();
      const dbClient = adminClient || supabase;

      let query = dbClient
        .from('profiles')
        .select('*');

      if (roleFilter === 'admin' || roleFilter === 'pharmacist') {
        query = query.eq('role', roleFilter);
      } else {
        query = query.in('role', ['admin', 'pharmacist']);
      }

      query = query.order('created_at', { ascending: true });

      const { data: staffList, error } = await query;

      if (!error && staffList) {
        const enriched = staffList.map((s) => ({
          ...s,
          email: SEED_EMAILS[s.id] || `${s.full_name.toLowerCase().replace(/[^a-z0-9]/g, '')}@jabat.id`,
        }));

        const totalAdmin = enriched.filter((s) => s.role === 'admin').length;
        const totalPharmacist = enriched.filter((s) => s.role === 'pharmacist').length;

        return NextResponse.json(
          {
            success: true,
            data: enriched,
            stats: {
              total: enriched.length,
              admin: totalAdmin,
              pharmacist: totalPharmacist,
            },
          },
          { headers: noCacheHeaders }
        );
      }
    }

    // Fallback mock data if database is not configured
    const fallbackStaff = [
      {
        id: 'ef729fc0-54a1-4091-b083-51d1d0ce44b3',
        role: 'admin',
        full_name: 'Administrator Apotek Jabat',
        phone: '081122334455',
        email: 'admin@jabat.id',
        avatar_url: null,
        sipa_number: null,
        created_at: new Date().toISOString(),
      },
      {
        id: 'ef729fc0-54a1-4091-b083-51d1d0ce44b2',
        role: 'pharmacist',
        full_name: 'apt. Siti Rahma, S.Farm.',
        phone: '081298765432',
        email: 'apoteker@jabat.id',
        avatar_url: null,
        sipa_number: '19870412/SIPA-31.74/2021/2048',
        created_at: new Date().toISOString(),
      },
    ];

    const filtered = roleFilter && roleFilter !== 'all'
      ? fallbackStaff.filter((s) => s.role === roleFilter)
      : fallbackStaff;

    return NextResponse.json(
      {
        success: true,
        data: filtered,
        stats: {
          total: fallbackStaff.length,
          admin: fallbackStaff.filter((s) => s.role === 'admin').length,
          pharmacist: fallbackStaff.filter((s) => s.role === 'pharmacist').length,
        },
      },
      { headers: noCacheHeaders }
    );
  } catch (err: any) {
    console.error('GET /api/staff error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal mengambil data staf.' },
      { status: 500, headers: noCacheHeaders }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { full_name, email, phone, role, sipa_number, password } = body;

    if (!full_name || !full_name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nama lengkap wajib diisi.' },
        { status: 400, headers: noCacheHeaders }
      );
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { success: false, error: 'Alamat email wajib diisi.' },
        { status: 400, headers: noCacheHeaders }
      );
    }

    if (!role || (role !== 'admin' && role !== 'pharmacist')) {
      return NextResponse.json(
        { success: false, error: 'Peran akun harus ditentukan (admin atau pharmacist).' },
        { status: 400, headers: noCacheHeaders }
      );
    }

    if (role === 'pharmacist' && (!sipa_number || !sipa_number.trim())) {
      return NextResponse.json(
        { success: false, error: 'Nomor SIPA wajib diisi untuk peran Apoteker.' },
        { status: 400, headers: noCacheHeaders }
      );
    }

    const defaultPassword = password && password.trim().length >= 6 ? password.trim() : 'Password123!';
    const cleanPhone = phone ? phone.trim() : '';

    if (isSupabaseConfigured()) {
      const adminClient = await getSupabaseAdminClient();
      const dbClient = adminClient || supabase;

      // 1. Create auth user in Supabase GoTrue
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: defaultPassword,
        options: {
          data: {
            full_name: full_name.trim(),
            phone: cleanPhone,
            role,
            sipa_number: role === 'pharmacist' ? sipa_number.trim() : null,
          },
        },
      });

      if (signUpError) {
        console.warn('Staff signUp notice:', signUpError);
        return NextResponse.json(
          { success: false, error: signUpError.message },
          { status: 400, headers: noCacheHeaders }
        );
      }

      const newUserId = signUpData.user?.id;
      if (!newUserId) {
        return NextResponse.json(
          { success: false, error: 'Gagal membuat pengguna baru.' },
          { status: 500, headers: noCacheHeaders }
        );
      }

      // 2. Upsert profile row into public.profiles
      const { data: profile, error: profileError } = await dbClient
        .from('profiles')
        .upsert({
          id: newUserId,
          full_name: full_name.trim(),
          phone: cleanPhone,
          role,
          sipa_number: role === 'pharmacist' ? sipa_number.trim() : null,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (profileError) {
        console.error('Staff profile upsert error:', profileError);
        return NextResponse.json(
          { success: false, error: profileError.message },
          { status: 400, headers: noCacheHeaders }
        );
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            ...profile,
            email: email.trim().toLowerCase(),
          },
          message: 'Akun staf berhasil dibuat.',
        },
        { headers: noCacheHeaders }
      );
    }

    // Fallback response for mock
    const newStaff = {
      id: 'staff-' + Date.now(),
      full_name: full_name.trim(),
      email: email.trim().toLowerCase(),
      phone: cleanPhone,
      role,
      sipa_number: role === 'pharmacist' ? sipa_number.trim() : null,
      avatar_url: null,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json(
      {
        success: true,
        data: newStaff,
        message: 'Akun staf berhasil dibuat (mode offline).',
      },
      { headers: noCacheHeaders }
    );
  } catch (err: any) {
    console.error('POST /api/staff error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Terjadi kesalahan saat menambah staf.' },
      { status: 500, headers: noCacheHeaders }
    );
  }
}
