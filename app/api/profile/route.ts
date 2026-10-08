import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Parameter userId wajib disertakan.' },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured()) {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profile && !error) {
        return NextResponse.json({ success: true, data: profile });
      }
    }

    return NextResponse.json(
      { success: false, error: 'Profil pengguna tidak ditemukan di database.' },
      { status: 404 }
    );
  } catch (err: any) {
    console.error('Get profile API error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal mengambil data profil.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { userId, fullName, phone, avatarUrl } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId wajib disertakan.' },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          phone,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
      }

      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json(
      { success: false, error: 'Koneksi database tidak tersedia.' },
      { status: 500 }
    );
  } catch (err: any) {
    console.error('Update profile API error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memperbarui profil.' },
      { status: 500 }
    );
  }
}
