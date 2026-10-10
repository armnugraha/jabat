import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// In-memory user wishlist storage
let userWishlistStorage: Record<string, any[]> = {};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: true, data: [] });
    }

    const items = userWishlistStorage[userId] || [];
    return NextResponse.json({ success: true, data: items });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal mengambil data wishlist.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, items } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId parameter is required.' },
        { status: 400 }
      );
    }

    userWishlistStorage[userId] = Array.isArray(items) ? items : [];

    return NextResponse.json({
      success: true,
      data: userWishlistStorage[userId],
      message: 'Wishlist berhasil diperbarui.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal menyimpan wishlist.' },
      { status: 500 }
    );
  }
}
