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

// Root admin ID that must not be deleted
const ROOT_ADMIN_ID = 'ef729fc0-54a1-4091-b083-51d1d0ce44b3';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID staf tidak ditemukan.' },
        { status: 400, headers: noCacheHeaders }
      );
    }

    if (isSupabaseConfigured()) {
      const adminClient = await getSupabaseAdminClient();
      const dbClient = adminClient || supabase;

      const { data: staff, error } = await dbClient
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !staff) {
        return NextResponse.json(
          { success: false, error: 'Data staf tidak ditemukan.' },
          { status: 404, headers: noCacheHeaders }
        );
      }

      return NextResponse.json(
        { success: true, data: staff },
        { headers: noCacheHeaders }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Database tidak terkonfigurasi.' },
      { status: 500, headers: noCacheHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal mengambil data staf.' },
      { status: 500, headers: noCacheHeaders }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { full_name, phone, role, sipa_number, avatar_url } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID staf wajib disertakan.' },
        { status: 400, headers: noCacheHeaders }
      );
    }

    if (role && role !== 'admin' && role !== 'pharmacist') {
      return NextResponse.json(
        { success: false, error: 'Peran akun tidak valid (harus admin atau pharmacist).' },
        { status: 400, headers: noCacheHeaders }
      );
    }

    if (isSupabaseConfigured()) {
      const adminClient = await getSupabaseAdminClient();
      const dbClient = adminClient || supabase;

      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (full_name !== undefined) updatePayload.full_name = full_name.trim();
      if (phone !== undefined) updatePayload.phone = phone.trim();
      if (role !== undefined) updatePayload.role = role;
      if (avatar_url !== undefined) updatePayload.avatar_url = avatar_url;
      if (sipa_number !== undefined) {
        updatePayload.sipa_number = role === 'admin' ? null : sipa_number?.trim() || null;
      }

      const { data, error } = await dbClient
        .from('profiles')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Update staff error:', error);
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400, headers: noCacheHeaders }
        );
      }

      // Automatically sync store_settings with active pharmacist (or reset to dash if none)
      const { data: currentPharmacists } = await dbClient
        .from('profiles')
        .select('full_name, sipa_number')
        .eq('role', 'pharmacist')
        .order('created_at', { ascending: true })
        .limit(1);

      if (currentPharmacists && currentPharmacists.length > 0) {
        await dbClient
          .from('store_settings')
          .update({
            pharmacist_name: currentPharmacists[0].full_name,
            pharmacist_sipa: currentPharmacists[0].sipa_number || '',
            updated_at: new Date().toISOString(),
          })
          .not('id', 'is', null);
      } else {
        await dbClient
          .from('store_settings')
          .update({
            pharmacist_name: '-',
            pharmacist_sipa: '',
            updated_at: new Date().toISOString(),
          })
          .not('id', 'is', null);
      }

      return NextResponse.json(
        {
          success: true,
          data,
          message: 'Data staf berhasil diperbarui.',
        },
        { headers: noCacheHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: { id, full_name, phone, role, sipa_number },
        message: 'Data staf berhasil diperbarui (mode offline).',
      },
      { headers: noCacheHeaders }
    );
  } catch (err: any) {
    console.error('PUT /api/staff/[id] error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal memperbarui staf.' },
      { status: 500, headers: noCacheHeaders }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID staf wajib disertakan.' },
        { status: 400, headers: noCacheHeaders }
      );
    }

    if (id === ROOT_ADMIN_ID) {
      return NextResponse.json(
        {
          success: false,
          error: 'Akun Administrator Utama sistem tidak boleh dihapus demi keamanan dan integritas apotek.',
        },
        { status: 403, headers: noCacheHeaders }
      );
    }

    if (isSupabaseConfigured()) {
      const adminClient = await getSupabaseAdminClient();
      const dbClient = adminClient || supabase;

      const { error } = await dbClient
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete staff error:', error);
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 400, headers: noCacheHeaders }
        );
      }

      // Check remaining pharmacists and keep store_settings in sync
      const { data: remainingPharmacists } = await dbClient
        .from('profiles')
        .select('full_name, sipa_number')
        .eq('role', 'pharmacist')
        .order('created_at', { ascending: true })
        .limit(1);

      if (remainingPharmacists && remainingPharmacists.length > 0) {
        await dbClient
          .from('store_settings')
          .update({
            pharmacist_name: remainingPharmacists[0].full_name,
            pharmacist_sipa: remainingPharmacists[0].sipa_number || '',
            updated_at: new Date().toISOString(),
          })
          .not('id', 'is', null);
      } else {
        await dbClient
          .from('store_settings')
          .update({
            pharmacist_name: '-',
            pharmacist_sipa: '',
            updated_at: new Date().toISOString(),
          })
          .not('id', 'is', null);
      }

      return NextResponse.json(
        {
          success: true,
          message: 'Akun staf berhasil dihapus.',
        },
        { headers: noCacheHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Akun staf berhasil dihapus (mode offline).',
      },
      { headers: noCacheHeaders }
    );
  } catch (err: any) {
    console.error('DELETE /api/staff/[id] error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal menghapus staf.' },
      { status: 500, headers: noCacheHeaders }
    );
  }
}
