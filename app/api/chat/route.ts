import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { formatChatTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  Pragma: 'no-cache',
  Expires: '0',
};

const DEFAULT_PHARMACIST_ID = 'ef729fc0-54a1-4091-b083-51d1d0ce44b2';
const DEFAULT_PHARMACIST_NAME = 'apt. Siti Rahma, S.Farm.';

function isValidUUID(val: any): boolean {
  return (
    typeof val === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val)
  );
}

function formatMessageRow(row: any) {
  const isPharmacistOrAdmin =
    row.sender?.role === 'pharmacist' ||
    row.sender?.role === 'admin' ||
    row.sender_id === DEFAULT_PHARMACIST_ID;

  return {
    id: row.id,
    conversation_id: row.conversation_id,
    sender_id: row.sender_id,
    sender_name:
      row.sender?.full_name ||
      (isPharmacistOrAdmin ? DEFAULT_PHARMACIST_NAME : 'Pelanggan'),
    sender_role: isPharmacistOrAdmin ? 'pharmacist' : 'customer',
    sender_avatar: row.sender?.avatar_url || null,
    message: row.message,
    attachment_path: row.attachment_path || null,
    attachment_url: row.attachment_path || null,
    recommended_product: row.product || undefined,
    is_read: row.is_read ?? true,
    created_at: formatChatTime(row.created_at),
    raw_created_at: row.created_at,
  };
}

// GET /api/chat
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const conversationId = searchParams.get('conversationId');
    const isAdmin = searchParams.get('admin') === 'true' || searchParams.get('conversations') === 'true';

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Database Supabase belum terkonfigurasi.' },
        { status: 500, headers: noCacheHeaders }
      );
    }

    const supabase = await getSupabaseAdminClient(request);

    // 1. Admin/Pharmacist list all conversations
    if (isAdmin) {
      const { data: convs, error: convError } = await supabase
        .from('conversations')
        .select(`
          id,
          customer_id,
          status,
          last_message_at,
          created_at,
          customer:profiles!customer_id (id, full_name, phone, avatar_url, role),
          messages (id, message, created_at, sender_id, is_read)
        `)
        .order('last_message_at', { ascending: false });

      if (convError) {
        console.error('Supabase fetch conversations error:', convError);
        return NextResponse.json(
          { success: false, error: convError.message },
          { status: 500, headers: noCacheHeaders }
        );
      }

      const formattedList = (convs || []).map((conv: any) => {
        const msgs = conv.messages || [];
        msgs.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const latestMsg = msgs[0];
        const unreadCount = msgs.filter((m: any) => !m.is_read && m.sender_id === conv.customer_id).length;

        return {
          id: conv.id,
          customer_id: conv.customer_id,
          customer_name: conv.customer?.full_name || 'Pelanggan',
          customer_phone: conv.customer?.phone || '',
          customer_avatar: conv.customer?.avatar_url || null,
          status: conv.status || 'open',
          last_message: latestMsg?.message || 'Konsultasi dibuka',
          last_message_at: latestMsg?.created_at
            ? formatChatTime(latestMsg.created_at)
            : formatChatTime(conv.last_message_at),
          unread_count: unreadCount,
        };
      });

      return NextResponse.json(
        { success: true, data: formattedList },
        { headers: noCacheHeaders }
      );
    }

    // 2. Fetch specific conversation by conversationId
    if (conversationId && isValidUUID(conversationId)) {
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id (id, full_name, role, avatar_url),
          product:products!recommended_product_id (*, variants:product_variants(*))
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (msgError) {
        console.error('Supabase fetch conversation messages error:', msgError);
        return NextResponse.json(
          { success: false, error: msgError.message },
          { status: 500, headers: noCacheHeaders }
        );
      }

      const formatted = (messages || []).map(formatMessageRow);
      return NextResponse.json(
        { success: true, conversationId, data: formatted },
        { headers: noCacheHeaders }
      );
    }

    // 3. Customer fetch by userId
    if (!userId || !isValidUUID(userId)) {
      return NextResponse.json(
        { success: false, error: 'userId valid wajib disertakan.' },
        { status: 400, headers: noCacheHeaders }
      );
    }

    // Find conversation for this user
    let { data: conv, error: convFindErr } = await supabase
      .from('conversations')
      .select('id, customer_id, status, last_message_at')
      .eq('customer_id', userId)
      .maybeSingle();

    if (convFindErr) {
      console.error('Supabase find conv error:', convFindErr);
    }

    // If no conversation exists yet, create one in Supabase
    if (!conv) {
      const { data: newConv, error: newConvErr } = await supabase
        .from('conversations')
        .insert({ customer_id: userId, status: 'open' })
        .select('id, customer_id, status, last_message_at')
        .single();

      if (newConvErr) {
        console.error('Supabase create conv error:', newConvErr);
      } else {
        conv = newConv;

        // Seed initial welcome message from verified pharmacist in Supabase
        await supabase.from('messages').insert({
          conversation_id: conv.id,
          sender_id: DEFAULT_PHARMACIST_ID,
          message:
            'Halo! Selamat datang di Meja Konsultasi Apotek Jabat. Saya apt. Siti Rahma, S.Farm. Apakah ada keluhan kesehatan, aturan pakai obat, atau resep dokter yang ingin Anda tanyakan?',
          is_read: true,
        });
      }
    }

    let formatted: any[] = [];
    if (conv) {
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!sender_id (id, full_name, role, avatar_url),
          product:products!recommended_product_id (*, variants:product_variants(*))
        `)
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: true });

      if (msgError) {
        console.error('Supabase fetch messages error:', msgError);
      } else if (messages && messages.length > 0) {
        formatted = messages.map(formatMessageRow);
      } else {
        // If empty, insert welcome greeting
        await supabase.from('messages').insert({
          conversation_id: conv.id,
          sender_id: DEFAULT_PHARMACIST_ID,
          message:
            'Halo! Selamat datang di Meja Konsultasi Apotek Jabat. Saya apt. Siti Rahma, S.Farm. Apakah ada keluhan kesehatan, aturan pakai obat, atau resep dokter yang ingin Anda tanyakan?',
          is_read: true,
        });

        // re-fetch
        const { data: refreshed } = await supabase
          .from('messages')
          .select(`
            *,
            sender:profiles!sender_id (id, full_name, role, avatar_url),
            product:products!recommended_product_id (*, variants:product_variants(*))
          `)
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: true });

        formatted = (refreshed || []).map(formatMessageRow);
      }
    }

    return NextResponse.json(
      {
        success: true,
        conversationId: conv?.id,
        data: formatted,
      },
      { headers: noCacheHeaders }
    );
  } catch (err: any) {
    console.error('Chat GET error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memuat percakapan chat.' },
      { status: 500, headers: noCacheHeaders }
    );
  }
}

// POST /api/chat
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      conversationId,
      senderId,
      senderRole,
      message,
      recommendedProductId,
      attachmentPath,
    } = body;

    const textMessage = message?.trim() || (attachmentPath ? '(Lampiran Foto/Resep)' : '');

    if (!textMessage && !attachmentPath) {
      return NextResponse.json(
        { success: false, error: 'Pesan atau lampiran wajib diisi.' },
        { status: 400, headers: noCacheHeaders }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Database Supabase belum terkonfigurasi.' },
        { status: 500, headers: noCacheHeaders }
      );
    }

    const supabase = await getSupabaseAdminClient(request);

    // Resolve conversation
    let convId = conversationId;
    if (!convId || !isValidUUID(convId)) {
      if (!userId || !isValidUUID(userId)) {
        return NextResponse.json(
          { success: false, error: 'userId atau conversationId valid wajib disertakan.' },
          { status: 400, headers: noCacheHeaders }
        );
      }

      let { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('customer_id', userId)
        .maybeSingle();

      if (!conv) {
        const { data: newConv, error: newConvErr } = await supabase
          .from('conversations')
          .insert({ customer_id: userId, status: 'open' })
          .select('id')
          .single();

        if (newConvErr || !newConv) {
          throw new Error('Gagal membuat percakapan baru di Supabase.');
        }
        conv = newConv;
      }
      convId = conv.id;
    }

    // Resolve actual sender ID in Supabase
    let actualSenderId = senderId;
    const isPharmacist = senderRole === 'pharmacist' || senderRole === 'admin';

    if (isPharmacist) {
      if (!isValidUUID(actualSenderId)) {
        actualSenderId = DEFAULT_PHARMACIST_ID;
      }
    } else {
      if (!isValidUUID(actualSenderId)) {
        actualSenderId = userId;
      }
    }

    if (!isValidUUID(actualSenderId)) {
      return NextResponse.json(
        { success: false, error: 'Pengirim tidak valid.' },
        { status: 400, headers: noCacheHeaders }
      );
    }

    const recProdId = isValidUUID(recommendedProductId) ? recommendedProductId : null;

    // Insert message into Supabase
    const { data: inserted, error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id: convId,
        sender_id: actualSenderId,
        message: textMessage,
        attachment_path: attachmentPath || null,
        recommended_product_id: recProdId,
        is_read: false,
      })
      .select(`
        *,
        sender:profiles!sender_id (id, full_name, role, avatar_url),
        product:products!recommended_product_id (*, variants:product_variants(*))
      `)
      .single();

    if (insertError || !inserted) {
      console.error('Supabase message insert error:', insertError);
      return NextResponse.json(
        { success: false, error: insertError?.message || 'Gagal menyimpan pesan ke Supabase.' },
        { status: 500, headers: noCacheHeaders }
      );
    }

    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', convId);

    const formatted = formatMessageRow(inserted);

    return NextResponse.json(
      {
        success: true,
        data: formatted,
      },
      { headers: noCacheHeaders }
    );
  } catch (err: any) {
    console.error('Chat POST error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal mengirim pesan.' },
      { status: 500, headers: noCacheHeaders }
    );
  }
}

// PATCH /api/chat (mark messages as read)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { conversationId, userId } = body;

    if (!isSupabaseConfigured()) {
      return NextResponse.json({ success: true }, { headers: noCacheHeaders });
    }

    const supabase = await getSupabaseAdminClient(request);

    let convId = conversationId;
    if (!convId && userId && isValidUUID(userId)) {
      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('customer_id', userId)
        .maybeSingle();
      if (conv) convId = conv.id;
    }

    if (convId && isValidUUID(convId)) {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', convId)
        .eq('is_read', false);
    }

    return NextResponse.json({ success: true }, { headers: noCacheHeaders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500, headers: noCacheHeaders });
  }
}
