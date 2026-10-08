import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

let userCartStorage: Record<string, any[]> = {};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ success: true, data: [] });
    }

    const items = userCartStorage[userId] || [];
    return NextResponse.json({ success: true, data: items });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal mengambil data keranjang.' },
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
        { success: false, error: 'userId wajib disertakan.' },
        { status: 400 }
      );
    }

    userCartStorage[userId] = items || [];

    return NextResponse.json({
      success: true,
      data: userCartStorage[userId],
      message: 'Keranjang berhasil diperbarui.',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal menyimpan keranjang.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (userId && userCartStorage[userId]) {
      delete userCartStorage[userId];
    }

    return NextResponse.json({ success: true, message: 'Keranjang dikosongkan.' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal mengosongkan keranjang.' },
      { status: 500 }
    );
  }
}
