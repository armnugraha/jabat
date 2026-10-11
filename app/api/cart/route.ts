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

function isValidUUID(val: any): boolean {
  return (
    typeof val === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val)
  );
}

// GET /api/cart?userId=<uuid>
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '';

    // If guest or invalid UUID, return empty array (guest uses localStorage)
    if (!isValidUUID(userId)) {
      return NextResponse.json(
        { success: true, data: [], count: 0 },
        { headers: noCacheHeaders }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Koneksi Supabase belum terkonfigurasi.' },
        { status: 500, headers: noCacheHeaders }
      );
    }

    const supabase = await getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('cart_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      // If table has not been created yet in Supabase
      if (error.code === 'PGRST205') {
        console.warn('Tabel cart_items belum ditemukan di Supabase. Silakan jalankan script SQL migrasi.');
        return NextResponse.json(
          {
            success: true,
            data: [],
            count: 0,
            warning: 'Tabel cart_items belum dibuat di Supabase. Jalankan script migrasi di SQL Editor Supabase.',
          },
          { headers: noCacheHeaders }
        );
      }
      console.error('Supabase get cart error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Gagal mengambil data keranjang dari database.' },
        { status: 500, headers: noCacheHeaders }
      );
    }

    const items = (data || []).map((row: any) => {
      const base = row.item_data && typeof row.item_data === 'object' ? row.item_data : {};
      const fallbackId = row.id?.includes('_') ? row.id.split('_').slice(1).join('_') : row.id;
      return {
        ...base,
        id: base.id || fallbackId,
        quantity: typeof row.quantity === 'number' ? row.quantity : (base.quantity || 1),
        selected: row.selected !== undefined ? row.selected : (base.selected !== false),
      };
    });

    return NextResponse.json(
      { success: true, data: items, count: items.length },
      { headers: noCacheHeaders }
    );
  } catch (err: any) {
    console.error('API GET /api/cart exception:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal mengambil data keranjang.' },
      { status: 500, headers: noCacheHeaders }
    );
  }
}

// POST /api/cart -> Body: { userId: string, items: CartItem[] }
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, items } = body;

    const validatedItems = Array.isArray(items) ? items : [];

    // Guest users are saved client-side
    if (!isValidUUID(userId)) {
      return NextResponse.json(
        {
          success: true,
          data: validatedItems,
          count: validatedItems.length,
          message: 'Data keranjang tamu diterima.',
        },
        { headers: noCacheHeaders }
      );
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Koneksi Supabase belum terkonfigurasi.' },
        { status: 500, headers: noCacheHeaders }
      );
    }

    const supabase = await getSupabaseAdminClient();

    // 1. Clear previous items for this user in Supabase
    const { error: deleteError } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      if (deleteError.code === 'PGRST205') {
        return NextResponse.json(
          {
            success: false,
            error: 'Tabel cart_items belum dibuat di Supabase. Silakan jalankan file cart_migration.sql di SQL Editor Supabase.',
          },
          { status: 500, headers: noCacheHeaders }
        );
      }
      console.error('Supabase clear cart error:', deleteError);
      return NextResponse.json(
        { success: false, error: deleteError.message || 'Gagal memperbarui keranjang di database.' },
        { status: 500, headers: noCacheHeaders }
      );
    }

    // 2. If new items exist, batch insert to Supabase
    if (validatedItems.length > 0) {
      const rows = validatedItems.map((item: any) => {
        const prodId = item.product?.id || item.product_id;
        const varId = item.variant?.id || item.variant_id;
        const cleanItemId = item.id || `${prodId}-${varId}`;
        return {
          id: `${userId}_${cleanItemId}`,
          user_id: userId,
          product_id: isValidUUID(prodId) ? prodId : null,
          variant_id: isValidUUID(varId) ? varId : null,
          quantity: Math.max(1, Number(item.quantity) || 1),
          selected: item.selected !== false,
          item_data: item,
          updated_at: new Date().toISOString(),
        };
      });

      const { error: insertError } = await supabase
        .from('cart_items')
        .insert(rows);

      if (insertError) {
        console.error('Supabase insert cart items error:', insertError);
        return NextResponse.json(
          { success: false, error: insertError.message || 'Gagal menyimpan item keranjang ke Supabase.' },
          { status: 500, headers: noCacheHeaders }
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: validatedItems,
        count: validatedItems.length,
        message: 'Keranjang berhasil diperbarui di Supabase.',
      },
      { headers: noCacheHeaders }
    );
  } catch (err: any) {
    console.error('API POST /api/cart exception:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal menyimpan keranjang.' },
      { status: 500, headers: noCacheHeaders }
    );
  }
}

// DELETE /api/cart?userId=<uuid>&itemId=<string>
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || '';
    const itemId = searchParams.get('itemId');

    if (!isValidUUID(userId)) {
      return NextResponse.json(
        { success: true, message: 'Keranjang dikosongkan.', data: [] },
        { headers: noCacheHeaders }
      );
    }

    if (isSupabaseConfigured()) {
      const supabase = await getSupabaseAdminClient();
      let query = supabase.from('cart_items').delete().eq('user_id', userId);
      if (itemId) {
        query = query.eq('id', `${userId}_${itemId}`);
      }
      const { error } = await query;
      if (error && error.code !== 'PGRST205') {
        console.error('Supabase delete cart error:', error);
        return NextResponse.json(
          { success: false, error: error.message || 'Gagal menghapus keranjang dari database.' },
          { status: 500, headers: noCacheHeaders }
        );
      }
    }

    return NextResponse.json(
      { success: true, message: itemId ? 'Item berhasil dihapus.' : 'Keranjang dikosongkan.', data: [] },
      { headers: noCacheHeaders }
    );
  } catch (err: any) {
    console.error('API DELETE /api/cart exception:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal mengosongkan keranjang.' },
      { status: 500, headers: noCacheHeaders }
    );
  }
}
