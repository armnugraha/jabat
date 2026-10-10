import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { refresh_token } = body;

    if (!refresh_token) {
      return NextResponse.json(
        { success: false, error: 'refresh_token wajib disertakan.' },
        { status: 400 }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Supabase belum terkonfigurasi.' },
        { status: 500 }
      );
    }

    const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token }),
      cache: 'no-store',
    });

    const data = await res.json();

    if (!res.ok || !data.access_token) {
      return NextResponse.json(
        {
          success: false,
          error: data.error_description || data.message || 'Sesi login telah kadaluarsa (lebih dari 1 bulan).',
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      session: data,
      token: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_at,
    });
  } catch (err: any) {
    console.error('Refresh token error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memperbarui sesi login.' },
      { status: 500 }
    );
  }
}
