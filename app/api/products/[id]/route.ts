import { NextRequest, NextResponse } from 'next/server';
import { mockProducts } from '@/lib/data/mock-data';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { Product } from '@/lib/types';

function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idOrSlug = params.id;

    if (isSupabaseConfigured()) {
      const supabase = await getSupabaseAdminClient(request);
      let queryBuilder = supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          variants:product_variants(*)
        `);

      if (isValidUUID(idOrSlug)) {
        queryBuilder = queryBuilder.eq('id', idOrSlug);
      } else {
        queryBuilder = queryBuilder.eq('slug', idOrSlug);
      }

      const { data, error } = await queryBuilder.maybeSingle();

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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();
    const {
      name,
      description,
      category_id,
      requires_prescription,
      is_active,
      is_featured,
      bpom_number,
      manufacturer,
      indications,
      composition,
      dosage,
      precautions,
      storage_instructions,
      image_url,
      variants,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nama produk obat wajib diisi' },
        { status: 400 }
      );
    }

    let resolvedCategoryId: string | null = null;
    if (category_id && isValidUUID(category_id)) {
      resolvedCategoryId = category_id;
    }

    if (isSupabaseConfigured() && isValidUUID(id)) {
      const supabase = await getSupabaseAdminClient();

      // 1. Update products table
      const { data: updatedProduct, error: prodErr } = await supabase
        .from('products')
        .update({
          name: name.trim(),
          description: description || '',
          category_id: resolvedCategoryId,
          requires_prescription: Boolean(requires_prescription),
          is_active: is_active !== false,
          is_featured: Boolean(is_featured),
          bpom_number: bpom_number || null,
          manufacturer: manufacturer || null,
          indications: indications || null,
          composition: composition || null,
          dosage: dosage || null,
          precautions: precautions || null,
          storage_instructions: storage_instructions || null,
          image_url: image_url || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (prodErr) {
        console.error('Supabase product update error:', prodErr);
        return NextResponse.json(
          { success: false, error: prodErr.message || 'Gagal memperbarui produk di Supabase' },
          { status: 500 }
        );
      }

      // 2. Update / replace variants
      if (variants && Array.isArray(variants)) {
        // Delete old variants
        await supabase.from('product_variants').delete().eq('product_id', id);

        // Insert new variants
        const formattedVariants = variants.map((v: any) => ({
          id: v.id && isValidUUID(v.id) ? v.id : crypto.randomUUID(),
          product_id: id,
          name: v.name || 'Satuan',
          unit: v.unit || 'pcs',
          quantity_per_package: Number(v.quantity_per_package) || 1,
          price: Number(v.price) || 0,
          strike_price: v.strike_price ? Number(v.strike_price) : null,
          discount_percentage: v.strike_price && v.price
            ? Math.round(((v.strike_price - v.price) / v.strike_price) * 100)
            : 0,
          stock: Number(v.stock) || 0,
          is_active: v.is_active !== false,
        }));

        const { error: varErr } = await supabase.from('product_variants').insert(formattedVariants);
        if (varErr) {
          console.error('Supabase variants update error:', varErr);
          return NextResponse.json(
            { success: false, error: varErr.message || 'Gagal memperbarui varian produk di Supabase' },
            { status: 500 }
          );
        }
      }

      return NextResponse.json({
        success: true,
        data: updatedProduct,
        message: 'Produk berhasil diperbarui di Supabase',
      });
    }

    // Fallback update
    return NextResponse.json({
      success: true,
      message: 'Produk berhasil diperbarui',
    });
  } catch (err: any) {
    console.error('Update product error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memperbarui produk' },
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

    if (isSupabaseConfigured() && isValidUUID(id)) {
      const supabase = await getSupabaseAdminClient();
      await supabase.from('product_variants').delete().eq('product_id', id);
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        return NextResponse.json(
          { success: false, error: error.message || 'Gagal menghapus produk di Supabase' },
          { status: 500 }
        );
      }
      return NextResponse.json({
        success: true,
        message: 'Produk berhasil dihapus dari Supabase',
      });
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

