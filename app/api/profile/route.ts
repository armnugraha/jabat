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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Parameter userId wajib disertakan.' },
        { status: 400, headers: noCacheHeaders }
      );
    }

    if (isSupabaseConfigured()) {
      const adminClient = await getSupabaseAdminClient();
      const { data: profile, error } = await adminClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profile && !error) {
        return NextResponse.json(
          { success: true, data: profile },
          { headers: noCacheHeaders }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'Profil pengguna tidak ditemukan di database.' },
      { status: 404, headers: noCacheHeaders }
    );
  } catch (err: any) {
    console.error('Get profile API error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal mengambil data profil.' },
      { status: 500, headers: noCacheHeaders }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const userId = body.userId || body.id;
    const fullName = body.fullName || body.full_name;
    const phone = body.phone;
    const avatarUrl = body.avatarUrl !== undefined ? body.avatarUrl : body.avatar_url;
    const sipaNumber = body.sipaNumber !== undefined ? body.sipaNumber : body.sipa_number;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId wajib disertakan.' },
        { status: 400, headers: noCacheHeaders }
      );
    }

    if (isSupabaseConfigured()) {
      const adminClient = await getSupabaseAdminClient();

      if (phone !== undefined && phone !== null && phone.trim()) {
        const cleanPhone = phone.trim();
        const phoneDigits = cleanPhone.replace(/\D/g, '');
        const localPhone = phoneDigits.startsWith('62') ? '0' + phoneDigits.slice(2) : phoneDigits;
        const intlPhone = phoneDigits.startsWith('0') ? '62' + phoneDigits.slice(1) : phoneDigits;
        const phoneVariants = Array.from(new Set([
          cleanPhone,
          phoneDigits,
          localPhone,
          intlPhone,
          `+${intlPhone}`,
          localPhone.length >= 10 ? `${localPhone.slice(0, 4)}-${localPhone.slice(4, 8)}-${localPhone.slice(8)}` : '',
        ].filter(Boolean)));

        const { data: duplicateProfile } = await adminClient
          .from('profiles')
          .select('id')
          .neq('id', userId)
          .in('phone', phoneVariants)
          .limit(1)
          .maybeSingle();

        if (duplicateProfile) {
          return NextResponse.json(
            { success: false, error: 'Nomor WhatsApp / telepon ini sudah digunakan oleh akun lain.' },
            { status: 409, headers: noCacheHeaders }
          );
        }
      }

      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (fullName !== undefined) updatePayload.full_name = fullName;
      if (phone !== undefined) updatePayload.phone = phone;
      if (avatarUrl !== undefined) updatePayload.avatar_url = avatarUrl;
      if (sipaNumber !== undefined) updatePayload.sipa_number = sipaNumber;

      const { data, error } = await adminClient
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        console.error('Supabase profile update error:', error);
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400, headers: noCacheHeaders }
        );
      }

      // Sync display_name and metadata to auth.users
      try {
        if (fullName || phone || avatarUrl !== undefined) {
          const authUpdateMetadata: Record<string, any> = {};
          if (fullName) {
            authUpdateMetadata.display_name = fullName;
            authUpdateMetadata.full_name = fullName;
          }
          if (phone) authUpdateMetadata.phone = phone;
          if (avatarUrl !== undefined) authUpdateMetadata.avatar_url = avatarUrl;

          await adminClient.auth.admin.updateUserById(userId, {
            user_metadata: authUpdateMetadata,
          });
        }
      } catch (authSyncErr) {
        console.warn('Auth user_metadata sync notice:', authSyncErr);
      }

      return NextResponse.json(
        {
          success: true,
          data,
          message: 'Profil berhasil diperbarui di database.',
        },
        { headers: noCacheHeaders }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Koneksi database tidak tersedia.' },
      { status: 500, headers: noCacheHeaders }
    );
  } catch (err: any) {
    console.error('Update profile API error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memperbarui profil.' },
      { status: 500, headers: noCacheHeaders }
    );
  }
}

