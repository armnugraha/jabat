import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  Pragma: 'no-cache',
  Expires: '0',
};

// Global singleton cache across Next.js worker threads and hot-reloads
declare global {
  var __jabat_cart_storage: Record<string, any[]> | undefined;
}

const userCartStorage: Record<string, any[]> =
  globalThis.__jabat_cart_storage || (globalThis.__jabat_cart_storage = {});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'guest';

    const items = userCartStorage[userId] || [];
    return NextResponse.json(
      { success: true, data: items, count: items.length },
      { headers: noCacheHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal mengambil data keranjang.' },
      { status: 500, headers: noCacheHeaders }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId = 'guest', items } = body;

    const validatedItems = Array.isArray(items) ? items : [];
    userCartStorage[userId] = validatedItems;

    return NextResponse.json(
      {
        success: true,
        data: userCartStorage[userId],
        count: validatedItems.length,
        message: 'Keranjang berhasil diperbarui.',
      },
      { headers: noCacheHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal menyimpan keranjang.' },
      { status: 500, headers: noCacheHeaders }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'guest';

    userCartStorage[userId] = [];

    return NextResponse.json(
      { success: true, message: 'Keranjang dikosongkan.', data: [] },
      { headers: noCacheHeaders }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal mengosongkan keranjang.' },
      { status: 500, headers: noCacheHeaders }
    );
  }
}

