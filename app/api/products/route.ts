import { NextRequest, NextResponse } from 'next/server';
import { mockProducts } from '@/lib/data/mock-data';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';
import { Product } from '@/lib/types';

// In-memory store fallback when Supabase is not connected
let dynamicProducts: Product[] = [...mockProducts];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() || '';
    const categorySlug = searchParams.get('category') || '';
    const categoryId = searchParams.get('category_id') || '';
    const requiresPrescription = searchParams.get('requires_prescription');
    const featured = searchParams.get('featured');

    if (isSupabaseConfigured()) {
      let queryBuilder = supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          variants:product_variants(*)
        `)
        .eq('is_active', true);

      if (categorySlug && categorySlug !== 'all') {
        // Query through category relation if needed
      }

      if (requiresPrescription !== null && requiresPrescription !== undefined && requiresPrescription !== '') {
        queryBuilder = queryBuilder.eq('requires_prescription', requiresPrescription === 'true');
      }

      if (featured === 'true') {
        queryBuilder = queryBuilder.eq('is_featured', true);
      }

      const { data, error } = await queryBuilder;

      if (!error && data && data.length > 0) {
        let filtered = data;
        if (query) {
          filtered = filtered.filter((p: any) =>
            p.name.toLowerCase().includes(query) ||
            (p.description && p.description.toLowerCase().includes(query)) ||
            (p.indications && p.indications.toLowerCase().includes(query))
          );
        }
        return NextResponse.json({
          success: true,
          data: filtered,
          count: filtered.length,
          source: 'supabase',
        });
      }
    }

    // Local / In-memory fallback
    let result = dynamicProducts.filter((p) => {
      const matchQuery =
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        (p.indications && p.indications.toLowerCase().includes(query));

      let matchCategory = true;
      if (categorySlug && categorySlug !== 'all') {
        if (categorySlug === 'obat-bebas') {
          matchCategory = !p.requires_prescription && p.category_id === 'c1';
        } else if (categorySlug === 'resep' || categorySlug === 'wajib-resep') {
          matchCategory = p.requires_prescription;
        } else if (categorySlug === 'vitamin-suplemen') {
          matchCategory = p.category_id === 'c3';
        } else if (categorySlug === 'alat-kesehatan') {
          matchCategory = p.category_id === 'c5';
        } else if (categorySlug === 'perawatan-diri') {
          matchCategory = p.category_id === 'c2';
        } else if (categorySlug === 'flu-batuk') {
          matchCategory = p.name.toLowerCase().includes('batuk') || p.name.toLowerCase().includes('paracetamol');
        } else if (categorySlug === 'promo' || categorySlug === 'promo-spesial') {
          matchCategory = p.variants.some((v) => (v.discount_percentage || 0) > 0);
        } else {
          matchCategory = p.category?.slug === categorySlug || p.category_id === categorySlug;
        }
      }

      if (categoryId && categoryId !== 'all') {
        matchCategory = p.category_id === categoryId;
      }

      let matchPrescription = true;
      if (requiresPrescription !== null && requiresPrescription !== undefined && requiresPrescription !== '') {
        matchPrescription = p.requires_prescription === (requiresPrescription === 'true');
      }

      let matchFeatured = true;
      if (featured === 'true') {
        matchFeatured = p.is_featured === true;
      }

      return matchQuery && matchCategory && matchPrescription && matchFeatured;
    });

    return NextResponse.json({
      success: true,
      data: result,
      count: result.length,
      source: 'local_database',
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Gagal mengambil data produk obat',
        data: dynamicProducts,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Nama produk obat wajib diisi' },
        { status: 400 }
      );
    }

    const newProductId = `p-${Date.now()}`;
    const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const formattedVariants = (variants && variants.length > 0 ? variants : [
      {
        id: `v-${Date.now()}-1`,
        product_id: newProductId,
        name: 'Unit',
        unit: 'pcs',
        quantity_per_package: 1,
        price: 10000,
        stock: 50,
        is_active: true,
      }
    ]).map((v: any, index: number) => ({
      id: v.id || `v-${Date.now()}-${index + 1}`,
      product_id: newProductId,
      name: v.name || 'Satuan',
      unit: v.unit || 'pcs',
      quantity_per_package: Number(v.quantity_per_package) || 1,
      price: Number(v.price) || 0,
      strike_price: v.strike_price ? Number(v.strike_price) : undefined,
      discount_percentage: v.strike_price && v.price
        ? Math.round(((v.strike_price - v.price) / v.strike_price) * 100)
        : 0,
      stock: Number(v.stock) || 0,
      is_active: v.is_active !== false,
    }));

    const newProduct: Product = {
      id: newProductId,
      name: name.trim(),
      slug,
      description: description || '',
      category_id: category_id || 'c1',
      requires_prescription: Boolean(requires_prescription),
      is_active: is_active !== false,
      is_featured: Boolean(is_featured),
      bpom_number: bpom_number || 'DBL' + Math.floor(100000000 + Math.random() * 900000000) + 'A1',
      manufacturer: manufacturer || 'Apotek Sehat Mandiri',
      indications: indications || description || '',
      composition: composition || '',
      dosage: dosage || '',
      precautions: precautions || '',
      storage_instructions: storage_instructions || 'Simpan pada suhu ruangan (<30°C), sejuk dan kering.',
      image_url: image_url || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80',
      variants: formattedVariants,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured()) {
      // Store in Supabase
      const { data: prodData, error: prodErr } = await supabase
        .from('products')
        .insert([{
          id: newProduct.id,
          name: newProduct.name,
          slug: newProduct.slug,
          description: newProduct.description,
          category_id: newProduct.category_id,
          requires_prescription: newProduct.requires_prescription,
          is_active: newProduct.is_active,
          is_featured: newProduct.is_featured,
          bpom_number: newProduct.bpom_number,
          manufacturer: newProduct.manufacturer,
          indications: newProduct.indications,
          composition: newProduct.composition,
          dosage: newProduct.dosage,
          precautions: newProduct.precautions,
          storage_instructions: newProduct.storage_instructions,
          image_url: newProduct.image_url,
        }])
        .select()
        .single();

      if (!prodErr && prodData) {
        // Insert variants
        await supabase.from('product_variants').insert(
          formattedVariants.map((v: any) => ({
            ...v,
            product_id: prodData.id,
          }))
        );

        return NextResponse.json({
          success: true,
          data: newProduct,
          message: 'Produk berhasil disimpan ke Supabase',
        });
      }
    }

    dynamicProducts.unshift(newProduct);
    return NextResponse.json({
      success: true,
      data: newProduct,
      message: 'Produk berhasil disimpan ke database apotek',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal menyimpan produk' },
      { status: 500 }
    );
  }
}
