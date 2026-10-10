import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

let inMemoryChatMessages: Record<string, any[]> = {};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId wajib disertakan.' },
        { status: 400 }
      );
    }

    // Default welcome messages
    const defaultMessages = [
      {
        id: `msg-welcome-${userId}`,
        conversation_id: `conv-${userId}`,
        sender_id: 'pharm-siti',
        sender_name: 'apt. Siti Rahma, S.Farm.',
        sender_role: 'pharmacist',
        message: 'Halo! Selamat datang di Meja Konsultasi Apotek Jabat. Saya apt. Siti Rahma, S.Farm. Apakah ada keluhan kesehatan, aturan pakai obat, atau resep dokter yang ingin Anda tanyakan?',
        created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
        is_read: true,
      },
    ];

    if (isSupabaseConfigured()) {
      try {
        const supabase = await getSupabaseAdminClient(request);
        const { data: conv } = await supabase
          .from('conversations')
          .select('id')
          .eq('customer_id', userId)
          .maybeSingle();

        if (conv) {
          const { data: messages } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: true });

          if (messages && messages.length > 0) {
            return NextResponse.json({
              success: true,
              data: messages,
            });
          }
        }
      } catch (e) {
        console.warn('Supabase chat fetch notice:', e);
      }
    }

    const userMsgs = inMemoryChatMessages[userId] || defaultMessages;
    return NextResponse.json({
      success: true,
      data: userMsgs,
    });
  } catch (err: any) {
    console.error('Chat GET error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memuat percakapan chat.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, senderName, senderRole, message, attachmentPath } = body;

    if (!userId || !message?.trim()) {
      return NextResponse.json(
        { success: false, error: 'userId dan pesan wajib diisi.' },
        { status: 400 }
      );
    }

    const newMessage = {
      id: `msg-${Date.now()}`,
      conversation_id: `conv-${userId}`,
      sender_id: userId,
      sender_name: senderName || 'Pasien',
      sender_role: senderRole || 'customer',
      message: message.trim(),
      attachment_path: attachmentPath || null,
      created_at: new Date().toISOString(),
      is_read: false,
    };

    if (!inMemoryChatMessages[userId]) {
      inMemoryChatMessages[userId] = [];
    }
    inMemoryChatMessages[userId].push(newMessage);

    if (isSupabaseConfigured()) {
      try {
        const supabase = await getSupabaseAdminClient(request);
        // Upsert conversation
        let { data: conv } = await supabase
          .from('conversations')
          .select('id')
          .eq('customer_id', userId)
          .maybeSingle();

        if (!conv) {
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({ customer_id: userId, status: 'open' })
            .select('id')
            .single();
          conv = newConv;
        }

        if (conv) {
          await supabase.from('messages').insert({
            conversation_id: conv.id,
            sender_id: userId,
            message: newMessage.message,
            attachment_path: newMessage.attachment_path,
          });
        }
      } catch (dbErr) {
        console.warn('Supabase message insert notice:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: newMessage,
    });
  } catch (err: any) {
    console.error('Chat POST error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal mengirim pesan.' },
      { status: 500 }
    );
  }
}

