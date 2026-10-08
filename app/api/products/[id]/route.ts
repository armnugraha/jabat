import { NextRequest, NextResponse } from 'next/server';
import { mockProducts } from '@/lib/data/mock-data';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idOrSlug = params.id;

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          variants:product_variants(*)
        `)
        .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
        .single();

      if (!error && data) {
        return NextResponse.json({
          success: true,
          data,
          source: 'supabase',
        });
      }
    }

    // Local fallback
    const product = mockProducts.find(
      (p) => p.id === idOrSlug || p.slug === idOrSlug
    );

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Produk obat tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: product,
      source: 'local_database',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal mengambil detail produk' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    if (isSupabaseConfigured()) {
      await supabase.from('products').delete().eq('id', id);
    }

    return NextResponse.json({
      success: true,
      message: 'Produk berhasil dihapus',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal menghapus produk' },
      { status: 500 }
    );
  }
}
