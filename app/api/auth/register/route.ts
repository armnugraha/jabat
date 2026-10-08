import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock-pharmacy.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-anon-key';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, phone, email, password } = body;

    if (!fullName?.trim() || !phone?.trim() || !email?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nama lengkap, nomor telepon/WhatsApp, dan email wajib diisi.' },
        { status: 400 }
      );
    }

    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password?.trim() || 'Apotek123!';

    let userId = `user-${Date.now()}`;
    let registeredUser = null;

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: {
            full_name: cleanName,
            phone: cleanPhone,
            role: 'customer',
          },
        },
      });

      if (error) {
        if (
          error.message.toLowerCase().includes('already registered') ||
          error.message.toLowerCase().includes('already exists')
        ) {
          return NextResponse.json(
            { success: false, error: 'Email ini sudah terdaftar. Silakan langsung masuk ke akun Anda.' },
            { status: 409 }
          );
        }
        console.warn('Supabase SignUp notice:', error.message);
      }

      if (data?.user?.id) {
        userId = data.user.id;

        // Upsert into profiles table using authenticated token if available
        try {
          const clientToUse = data.session?.access_token
            ? createClient(supabaseUrl, supabaseAnonKey, {
                global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
              })
            : supabase;

          await clientToUse.from('profiles').upsert({
            id: userId,
            full_name: cleanName,
            phone: cleanPhone,
            role: 'customer',
            avatar_url: null,
            updated_at: new Date().toISOString(),
          });
        } catch (dbErr) {
          console.warn('Profile upsert notice:', dbErr);
        }
      }
    }

    registeredUser = {
      id: userId,
      role: 'customer',
      full_name: cleanName,
      phone: cleanPhone,
      email: cleanEmail,
      avatar_url: null,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      user: registeredUser,
      message: 'Pendaftaran berhasil. Selamat datang di Apotek Sehat Mandiri!',
    });
  } catch (err: any) {
    console.error('Register API error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memproses pendaftaran.' },
      { status: 500 }
    );
  }
}
