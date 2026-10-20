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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (isSupabaseConfigured()) {
      const supabase = await getSupabaseAdminClient(request);
      let queryBuilder = supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          variants:product_variants(*)
        `);

      if (isValidUUID(id)) {
        queryBuilder = queryBuilder.eq('id', id);
      } else {
        queryBuilder = queryBuilder.eq('slug', id);
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
      (p) => p.id === id || p.slug === id
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    const mockP = mockProducts.find((p) => p.id === id || p.slug === id);
    if (mockP) {
      mockP.name = name.trim();
      mockP.description = description || '';
      mockP.category_id = category_id || mockP.category_id;
      mockP.requires_prescription = Boolean(requires_prescription);
      mockP.is_active = is_active !== false;
      mockP.is_featured = Boolean(is_featured);
      mockP.bpom_number = bpom_number || null;
      mockP.manufacturer = manufacturer || null;
      mockP.indications = indications || null;
      mockP.composition = composition || null;
      mockP.dosage = dosage || null;
      mockP.precautions = precautions || null;
      mockP.storage_instructions = storage_instructions || null;
      mockP.image_url = image_url || mockP.image_url;
      if (variants && Array.isArray(variants)) {
        mockP.variants = variants;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Produk berhasil diperbarui',
      data: mockP,
    });
  } catch (err: any) {
    console.error('Update product error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memperbarui produk' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { variantId, stock, delta, is_active } = body;

    // 1. Handle toggle active status
    if (is_active !== undefined) {
      const activeBool = Boolean(is_active);

      if (isSupabaseConfigured()) {
        const supabase = await getSupabaseAdminClient(request);
        let queryBuilder = supabase
          .from('products')
          .update({ is_active: activeBool, updated_at: new Date().toISOString() });

        if (isValidUUID(id)) {
          queryBuilder = queryBuilder.eq('id', id);
        } else {
          queryBuilder = queryBuilder.eq('slug', id);
        }

        const { data: updatedProd, error: updateErr } = await queryBuilder
          .select(`*, category:categories(*), variants:product_variants(*)`)
          .maybeSingle();

        if (updateErr) {
          console.error('Failed to update product is_active in Supabase:', updateErr);
          return NextResponse.json(
            { success: false, error: updateErr.message || 'Gagal mengubah status aktif produk di database' },
            { status: 500 }
          );
        }

        // Also sync local fallback in memory
        const mockP = mockProducts.find((p) => p.id === id || p.slug === id);
        if (mockP) {
          mockP.is_active = activeBool;
        }

        return NextResponse.json({
          success: true,
          message: `Produk berhasil ${activeBool ? 'diaktifkan' : 'dinonaktifkan'}`,
          data: updatedProd || mockP,
        });
      }

      // Fallback local update
      const mockP = mockProducts.find((p) => p.id === id || p.slug === id);
      if (mockP) {
        mockP.is_active = activeBool;
      }

      return NextResponse.json({
        success: true,
        message: `Produk berhasil ${activeBool ? 'diaktifkan' : 'dinonaktifkan'}`,
        data: mockP,
      });
    }

    // 2. Handle variant stock update
    if (!variantId) {
      return NextResponse.json(
        { success: false, error: 'variantId atau is_active wajib disertakan' },
        { status: 400 }
      );
    }

    let finalStock = 0;

    if (isSupabaseConfigured()) {
      const supabase = await getSupabaseAdminClient(request);

      // Fetch current variant
      const { data: variant, error: varFetchErr } = await supabase
        .from('product_variants')
        .select('id, stock, name, product_id')
        .eq('id', variantId)
        .maybeSingle();

      if (varFetchErr || !variant) {
        return NextResponse.json(
          { success: false, error: 'Varian produk tidak ditemukan di database.' },
          { status: 404 }
        );
      }

      if (typeof stock === 'number') {
        finalStock = Math.max(0, Math.round(stock));
      } else if (typeof delta === 'number') {
        finalStock = Math.max(0, (Number(variant.stock) || 0) + Math.round(delta));
      } else {
        return NextResponse.json(
          { success: false, error: 'stock atau delta wajib berupa angka' },
          { status: 400 }
        );
      }

      const { error: updateErr } = await supabase
        .from('product_variants')
        .update({ stock: finalStock })
        .eq('id', variantId);

      if (updateErr) {
        console.error('Failed to update variant stock in Supabase:', updateErr);
        return NextResponse.json(
          { success: false, error: updateErr.message },
          { status: 500 }
        );
      }
    } else {
      // Mock data fallback
      const prod = mockProducts.find((p) => p.id === id || p.slug === id);
      const variant = prod?.variants.find((v) => v.id === variantId);
      if (variant) {
        if (typeof stock === 'number') {
          variant.stock = Math.max(0, Math.round(stock));
        } else if (typeof delta === 'number') {
          variant.stock = Math.max(0, (variant.stock || 0) + Math.round(delta));
        }
        finalStock = variant.stock;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Stok varian berhasil diperbarui.',
      data: {
        productId: id,
        variantId,
        stock: finalStock,
      },
    });
  } catch (err: any) {
    console.error('PATCH /api/products/[id] error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memperbarui produk' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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


