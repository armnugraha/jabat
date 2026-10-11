import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

import { getSupabaseAdminClient } from '@/lib/supabase/server';

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

    const phoneDigits = cleanPhone.replace(/\D/g, '');
    if (phoneDigits.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Nomor telepon/WhatsApp tidak valid (minimal 8-10 digit).' },
        { status: 400 }
      );
    }

    let userId = `user-${Date.now()}`;
    let registeredUser = null;
    let authSession = null;

    if (isSupabaseConfigured()) {
      const adminClient = await getSupabaseAdminClient();
      const dbClient = adminClient || supabase;

      // 1. Check if phone number is already registered in profiles
      const localPhone = phoneDigits.startsWith('62') ? '0' + phoneDigits.slice(2) : phoneDigits;
      const intlPhone = phoneDigits.startsWith('0') ? '62' + phoneDigits.slice(1) : phoneDigits;

      const phoneVariants = Array.from(new Set([
        cleanPhone,
        phoneDigits,
        localPhone,
        intlPhone,
        `+${intlPhone}`,
        localPhone.length >= 10 ? `${localPhone.slice(0, 4)}-${localPhone.slice(4, 8)}-${localPhone.slice(8)}` : '',
        localPhone.length >= 10 ? `${localPhone.slice(0, 4)} ${localPhone.slice(4, 8)} ${localPhone.slice(8)}` : '',
      ].filter(Boolean)));

      const { data: existingProfile } = await dbClient
        .from('profiles')
        .select('id, phone')
        .in('phone', phoneVariants)
        .limit(1)
        .maybeSingle();

      if (existingProfile) {
        return NextResponse.json(
          {
            success: false,
            error: 'Nomor WhatsApp / telepon ini sudah terdaftar. Silakan gunakan nomor lain atau langsung masuk ke akun Anda.',
          },
          { status: 409 }
        );
      }

      // Check with subscriber suffix if digits >= 8
      if (phoneDigits.length >= 8) {
        const subscriberSuffix = phoneDigits.slice(-8);
        const { data: suffixMatches } = await dbClient
          .from('profiles')
          .select('id, phone')
          .ilike('phone', `%${subscriberSuffix}%`);

        if (suffixMatches && suffixMatches.length > 0) {
          const isTaken = suffixMatches.some((p: any) => {
            if (!p.phone) return false;
            const pDigits = p.phone.replace(/\D/g, '');
            const pLocal = pDigits.startsWith('62') ? '0' + pDigits.slice(2) : pDigits;
            return pLocal === localPhone || pDigits === phoneDigits;
          });

          if (isTaken) {
            return NextResponse.json(
              {
                success: false,
                error: 'Nomor WhatsApp / telepon ini sudah terdaftar. Silakan gunakan nomor lain atau langsung masuk ke akun Anda.',
              },
              { status: 409 }
            );
          }
        }
      }

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: {
            display_name: cleanName,
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

      if (data?.session) {
        authSession = data.session;
      }

      if (data?.user?.id) {
        userId = data.user.id;

        // Upsert into profiles table using authenticated token if available
        try {
          const clientToUse = data.session?.access_token
            ? createClient(supabaseUrl, supabaseAnonKey, {
                global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
              })
            : (adminClient || supabase);

          const { error: upsertError } = await clientToUse.from('profiles').upsert({
            id: userId,
            full_name: cleanName,
            phone: cleanPhone,
            role: 'customer',
            avatar_url: null,
            updated_at: new Date().toISOString(),
          });

          if (upsertError) {
            console.warn('Profile upsert notice:', upsertError);
            if (
              upsertError.message.toLowerCase().includes('unique') ||
              upsertError.message.toLowerCase().includes('duplicate') ||
              upsertError.code === '23505'
            ) {
              return NextResponse.json(
                {
                  success: false,
                  error: 'Nomor WhatsApp / telepon ini sudah terdaftar. Silakan gunakan nomor lain.',
                },
                { status: 409 }
              );
            }
          }
        } catch (dbErr: any) {
          console.warn('Profile upsert exception:', dbErr);
          if (
            dbErr?.message?.toLowerCase().includes('unique') ||
            dbErr?.message?.toLowerCase().includes('duplicate') ||
            dbErr?.code === '23505'
          ) {
            return NextResponse.json(
              {
                success: false,
                error: 'Nomor WhatsApp / telepon ini sudah terdaftar. Silakan gunakan nomor lain.',
              },
              { status: 409 }
            );
          }
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
      session: authSession,
      token: authSession?.access_token || null,
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
