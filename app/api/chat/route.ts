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

function isValidUUID(val: any): boolean {
  return (
    typeof val === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val)
  );
}

// Dynamically resolve a valid staff sender ID that strictly exists in Supabase profiles
async function resolveStaffSenderId(supabase: any, candidateId?: string | null): Promise<string> {
  // 1. If candidateId is provided and is a valid UUID, verify if it actually exists in profiles
  if (candidateId && isValidUUID(candidateId)) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', candidateId)
      .maybeSingle();
    if (existing?.id) {
      return existing.id;
    }
  }

  // 2. Query for an active pharmacist in profiles
  const { data: pharmacists } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'pharmacist')
    .order('created_at', { ascending: true })
    .limit(1);

  if (pharmacists && pharmacists.length > 0 && pharmacists[0].id) {
    return pharmacists[0].id;
  }

  // 3. If no pharmacist registered, query for an admin in profiles
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .eq('role', 'admin')
    .order('created_at', { ascending: true })
    .limit(1);

  if (admins && admins.length > 0 && admins[0].id) {
    return admins[0].id;
  }

  // 4. Fallback to any profile in profiles
  const { data: anyProf } = await supabase
    .from('profiles')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1);

  if (anyProf && anyProf.length > 0 && anyProf[0].id) {
    return anyProf[0].id;
  }

  throw new Error('Tidak ditemukan profil pengguna valid di database untuk pengirim pesan.');
}

// Fast and timeout-safe helper to fetch and format messages without slow recursive RLS joins
async function fetchConversationMessages(supabase: any, convId: string, customerId?: string) {
  // 1. Fetch raw messages directly from messages table (fast, no RLS timeout)
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, message, attachment_path, recommended_product_id, is_read, created_at')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true });

  if (msgError) {
    console.error('Fetch messages error:', msgError);
    return [];
  }

  if (!messages || messages.length === 0) {
    return [];
  }

  // 2. Resolve sender profiles
  const senderIds = Array.from(
    new Set(messages.map((m: any) => m.sender_id).filter(Boolean))
  );

  const senderMap = new Map<string, any>();
  if (senderIds.length > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, full_name, role, avatar_url, sipa_number')
      .in('id', senderIds);
    (profs || []).forEach((p: any) => senderMap.set(p.id, p));
  }

  // 3. Batch fetch recommended products if any message has one
  const recProductIds = Array.from(
    new Set(messages.map((m: any) => m.recommended_product_id).filter(Boolean))
  );

  const productMap = new Map<string, any>();
  if (recProductIds.length > 0) {
    const { data: prods } = await supabase
      .from('products')
      .select('id, name, image_url, variants:product_variants(id, price, stock)')
      .in('id', recProductIds);

    (prods || []).forEach((p: any) => productMap.set(p.id, p));
  }

  // 4. Map into standard ChatMessage structure
  return messages.map((row: any) => {
    const sender = senderMap.get(row.sender_id);
    const isCustomer = sender ? sender.role === 'customer' : (customerId ? row.sender_id === customerId : false);
    const isPharmacist = !isCustomer;

    const senderName = sender?.full_name || (isCustomer ? 'Pelanggan' : 'Apoteker Farmasi');
    const senderRole = isCustomer ? 'customer' : 'pharmacist';
    const senderAvatar = sender?.avatar_url || null;

    return {
      id: row.id,
      conversation_id: row.conversation_id,
      sender_id: row.sender_id,
      sender_name: senderName,
      sender_role: senderRole,
      sender_avatar: senderAvatar,
      message: row.message,
      attachment_path: row.attachment_path || null,
      attachment_url: row.attachment_path || null,
      recommended_product: row.recommended_product_id ? productMap.get(row.recommended_product_id) : undefined,
      is_read: row.is_read ?? true,
      created_at: formatChatTime(row.created_at),
      raw_created_at: row.created_at,
    };
  });
}

async function getOpeningMessage(supabase: any): Promise<string> {
  const DEFAULT_MESSAGE =
    'Halo! Selamat datang di Meja Konsultasi Apotek Jabat. Apakah ada keluhan kesehatan, aturan pakai obat, atau resep dokter yang ingin Anda tanyakan?';

  if (!supabase) return DEFAULT_MESSAGE;

  try {
    const { data } = await supabase
      .from('chat_auto_replies')
      .select('reply_message')
      .eq('id', '__config_opening_message__')
      .maybeSingle();

    if (data?.reply_message && data.reply_message.trim()) {
      return data.reply_message.trim();
    }
  } catch (e) {
    // ignore
  }

  return DEFAULT_MESSAGE;
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
      const { data: conv } = await supabase
        .from('conversations')
        .select('id, customer_id')
        .eq('id', conversationId)
        .maybeSingle();

      const formatted = await fetchConversationMessages(supabase, conversationId, conv?.customer_id);
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

    // Find conversation for this user - ALWAYS find all conversations for this customer
    const { data: userConvs, error: convFindErr } = await supabase
      .from('conversations')
      .select('id, customer_id, status, last_message_at, created_at')
      .eq('customer_id', userId)
      .order('created_at', { ascending: false });

    if (convFindErr) {
      console.error('Supabase find conv error:', convFindErr);
    }

    let conv: any = null;

    if (userConvs && userConvs.length > 0) {
      if (userConvs.length === 1) {
        conv = userConvs[0];
      } else {
        // If multiple conversations exist, find the one that has the most messages
        const convIds = userConvs.map((c: any) => c.id);
        const { data: msgSample } = await supabase
          .from('messages')
          .select('conversation_id')
          .in('conversation_id', convIds);

        if (msgSample && msgSample.length > 0) {
          const counts: Record<string, number> = {};
          for (const m of msgSample) {
            counts[m.conversation_id] = (counts[m.conversation_id] || 0) + 1;
          }
          let bestId = userConvs[0].id;
          let bestCount = -1;
          for (const c of userConvs) {
            const count = counts[c.id] || 0;
            if (count > bestCount) {
              bestCount = count;
              bestId = c.id;
            }
          }
          conv = userConvs.find((c: any) => c.id === bestId) || userConvs[0];
        } else {
          conv = userConvs[0];
        }
      }
    } else {
      // ONLY create a new conversation if user has zero conversations in database
      const { data: newConv, error: newConvErr } = await supabase
        .from('conversations')
        .insert({ customer_id: userId, status: 'open' })
        .select('id, customer_id, status, last_message_at')
        .single();

      if (newConvErr) {
        console.error('Supabase create conv error:', newConvErr);
      } else {
        conv = newConv;

        const openingMessage = await getOpeningMessage(supabase);
        try {
          const staffSenderId = await resolveStaffSenderId(supabase);
          // Seed initial welcome message from verified staff/pharmacist in Supabase
          await supabase.from('messages').insert({
            conversation_id: conv.id,
            sender_id: staffSenderId,
            message: openingMessage,
            is_read: true,
          });
        } catch (err) {
          console.warn('Could not seed initial welcome message:', err);
        }
      }
    }

    let formatted: any[] = [];
    if (conv) {
      formatted = await fetchConversationMessages(supabase, conv.id, userId);

      // If empty for some reason, seed welcome message
      if (formatted.length === 0) {
        const openingMessage = await getOpeningMessage(supabase);
        try {
          const staffSenderId = await resolveStaffSenderId(supabase);
          await supabase.from('messages').insert({
            conversation_id: conv.id,
            sender_id: staffSenderId,
            message: openingMessage,
            is_read: true,
          });
          formatted = await fetchConversationMessages(supabase, conv.id, userId);
        } catch (err) {
          console.warn('Could not seed welcome message:', err);
        }
      } else if (
        formatted.length === 1 &&
        formatted[0].sender_role === 'pharmacist'
      ) {
        // If the only message is the initial pharmacist welcome message, keep it synced with updated opening message
        const openingMessage = await getOpeningMessage(supabase);
        if (formatted[0].message !== openingMessage) {
          await supabase
            .from('messages')
            .update({ message: openingMessage })
            .eq('id', formatted[0].id);
          formatted[0].message = openingMessage;
        }
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
      senderName,
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

      const { data: userConvs } = await supabase
        .from('conversations')
        .select('id')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false });

      let conv = userConvs && userConvs.length > 0 ? userConvs[0] : null;

      if (userConvs && userConvs.length > 1) {
        const convIds = userConvs.map((c: any) => c.id);
        const { data: msgSample } = await supabase
          .from('messages')
          .select('conversation_id')
          .in('conversation_id', convIds);

        if (msgSample && msgSample.length > 0) {
          const counts: Record<string, number> = {};
          for (const m of msgSample) {
            counts[m.conversation_id] = (counts[m.conversation_id] || 0) + 1;
          }
          let bestId = userConvs[0].id;
          let bestCount = -1;
          for (const c of userConvs) {
            const count = counts[c.id] || 0;
            if (count > bestCount) {
              bestCount = count;
              bestId = c.id;
            }
          }
          conv = userConvs.find((c: any) => c.id === bestId) || userConvs[0];
        }
      }

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
      actualSenderId = await resolveStaffSenderId(supabase, actualSenderId);
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

    // Insert message into Supabase directly without heavy joins
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
      .select('id, conversation_id, sender_id, message, attachment_path, recommended_product_id, is_read, created_at')
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

    // Fetch product details if recommended product attached
    let recommendedProductObj: any = undefined;
    if (recProdId) {
      const { data: prod } = await supabase
        .from('products')
        .select('id, name, image_url, variants:product_variants(id, price, stock)')
        .eq('id', recProdId)
        .maybeSingle();
      recommendedProductObj = prod || undefined;
    }

    let senderDisplayName = isPharmacist ? (senderName || 'Apoteker Farmasi') : 'Pelanggan';
    let senderDisplayAvatar: string | null = null;
    if (actualSenderId) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', actualSenderId)
        .maybeSingle();
      if (prof?.full_name) senderDisplayName = prof.full_name;
      if (prof?.avatar_url) senderDisplayAvatar = prof.avatar_url;
    }

    const formatted = {
      id: inserted.id,
      conversation_id: inserted.conversation_id,
      sender_id: inserted.sender_id,
      sender_name: senderDisplayName,
      sender_role: isPharmacist ? 'pharmacist' : 'customer',
      sender_avatar: senderDisplayAvatar,
      message: inserted.message,
      attachment_path: inserted.attachment_path || null,
      attachment_url: inserted.attachment_path || null,
      recommended_product: recommendedProductObj,
      is_read: inserted.is_read ?? false,
      created_at: formatChatTime(inserted.created_at),
      raw_created_at: inserted.created_at,
    };

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
      return NextResponse.json(
        { success: false, error: 'Database Supabase belum terkonfigurasi.' },
        { status: 500, headers: noCacheHeaders }
      );
    }

    const supabase = await getSupabaseAdminClient(request);

    if (conversationId && isValidUUID(conversationId)) {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId);

      return NextResponse.json({ success: true }, { headers: noCacheHeaders });
    }

    if (userId && isValidUUID(userId)) {
      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('customer_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (conv) {
        await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('conversation_id', conv.id);
      }

      return NextResponse.json({ success: true }, { headers: noCacheHeaders });
    }

    return NextResponse.json(
      { success: false, error: 'conversationId atau userId valid wajib disertakan.' },
      { status: 400, headers: noCacheHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memperbarui status pesan.' },
      { status: 500, headers: noCacheHeaders }
    );
  }
}
