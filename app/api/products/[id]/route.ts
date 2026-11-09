import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { Product } from '@/lib/types';
import { isValidUUID } from '@/lib/utils';
import { getCompanionProductIds, setCompanionProductIds } from '@/lib/companions';

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
        const companionIds = await getCompanionProductIds(data.id);
        return NextResponse.json({
          success: true,
          data: {
            ...data,
            companion_product_ids: companionIds,
          },
          source: 'supabase',
        });
      }
    }

    return NextResponse.json(
      { success: false, error: 'Produk obat tidak ditemukan' },
      { status: 404 }
    );
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
      companion_product_ids,
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

      // 2. Update / upsert variants safely
      if (variants && Array.isArray(variants)) {
        // Fetch existing variants from DB to detect deletions
        const { data: currentVariants } = await supabase
          .from('product_variants')
          .select('id')
          .eq('product_id', id);

        const currentVariantIds = (currentVariants || []).map((v: any) => v.id);

        const formattedVariants = variants.map((v: any) => ({
          id: v.id && isValidUUID(v.id) ? v.id : crypto.randomUUID(),
          product_id: id,
          name: v.name || 'Satuan',
          unit: v.unit || 'pcs',
          quantity_per_package: Number(v.quantity_per_package) || 1,
          price: Number(v.price) || 0,
          strike_price: v.strike_price ? Number(v.strike_price) : null,
          discount_percentage:
            v.strike_price && v.price
              ? Math.round(((v.strike_price - v.price) / v.strike_price) * 100)
              : 0,
          stock: Number(v.stock) || 0,
          is_active: v.is_active !== false,
          updated_at: new Date().toISOString(),
        }));

        const submittedIds = new Set(formattedVariants.map((v: any) => v.id));
        const removedVariantIds = currentVariantIds.filter((cid: string) => !submittedIds.has(cid));

        if (removedVariantIds.length > 0) {
          try {
            await supabase.from('cart_items').delete().in('variant_id', removedVariantIds);
            await supabase.from('order_items').update({ variant_id: null }).in('variant_id', removedVariantIds);
            await supabase.from('product_variants').delete().in('id', removedVariantIds);
          } catch (delErr) {
            console.warn('Could not delete removed variants, deactivating instead:', delErr);
            await supabase.from('product_variants').update({ is_active: false }).in('id', removedVariantIds);
          }
        }

        const { error: varErr } = await supabase.from('product_variants').upsert(formattedVariants);
        if (varErr) {
          console.error('Supabase variants upsert error:', varErr);
          return NextResponse.json(
            { success: false, error: varErr.message || 'Gagal memperbarui varian produk di Supabase' },
            { status: 500 }
          );
        }
      }

      if (companion_product_ids !== undefined) {
        await setCompanionProductIds(id, companion_product_ids);
      }

      return NextResponse.json({
        success: true,
        data: updatedProduct,
        message: 'Produk berhasil diperbarui di Supabase',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Produk tidak ditemukan atau database tidak terhubung' },
      { status: 404 }
    );
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

        return NextResponse.json({
          success: true,
          message: `Produk berhasil ${activeBool ? 'diaktifkan' : 'dinonaktifkan'}`,
          data: updatedProd,
        });
      }

      return NextResponse.json(
        { success: false, error: 'Database tidak terhubung' },
        { status: 500 }
      );
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
      return NextResponse.json(
        { success: false, error: 'Database tidak terhubung' },
        { status: 500 }
      );
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

      // 1. Detach order_items referencing this product
      await supabase.from('order_items').update({ product_id: null }).eq('product_id', id);

      // 2. Detach or delete variants references
      const { data: existingVariants } = await supabase
        .from('product_variants')
        .select('id')
        .eq('product_id', id);

      if (existingVariants && existingVariants.length > 0) {
        const varIds = existingVariants.map((v: any) => v.id);
        await supabase.from('order_items').update({ variant_id: null }).in('variant_id', varIds);
        await supabase.from('cart_items').delete().in('variant_id', varIds);
      }

      // 3. Clean up cart items for this product
      await supabase.from('cart_items').delete().eq('product_id', id);

      // 4. Detach recommended product in chat auto replies
      await supabase.from('chat_auto_replies').update({ recommended_product_id: null }).eq('recommended_product_id', id);

      // 5. Delete product variants
      await supabase.from('product_variants').delete().eq('product_id', id);

      // 6. Delete product from database
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        return NextResponse.json(
          { success: false, error: error.message || 'Gagal menghapus produk di Supabase' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Produk berhasil dihapus dari database',
      });
    }

    return NextResponse.json(
      { success: false, error: 'Database tidak terhubung' },
      { status: 500 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal menghapus produk' },
      { status: 500 }
    );
  }
}
