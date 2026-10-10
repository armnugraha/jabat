import { NextRequest, NextResponse } from 'next/server';
import { mockProducts, mockCategories } from '@/lib/data/mock-data';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { Product } from '@/lib/types';

// In-memory store fallback when Supabase is not connected
let dynamicProducts: Product[] = [...mockProducts];

// Helper to check if string is valid UUID
function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.toLowerCase() || '';
    const categorySlug = searchParams.get('category') || '';
    const categoryId = searchParams.get('category_id') || '';
    const requiresPrescription = searchParams.get('requires_prescription');
    const featured = searchParams.get('featured');
    const sort = searchParams.get('sort') || 'terpopuler';
    const minPrice = searchParams.get('min_price') ? Number(searchParams.get('min_price')) : null;
    const maxPrice = searchParams.get('max_price') ? Number(searchParams.get('max_price')) : null;

    if (isSupabaseConfigured()) {
      const supabase = await getSupabaseAdminClient(request);
      let queryBuilder = supabase
        .from('products')
        .select(`
          *,
          category:categories(*),
          variants:product_variants(*)
        `)
        .order('created_at', { ascending: false });

      if (requiresPrescription !== null && requiresPrescription !== undefined && requiresPrescription !== '') {
        queryBuilder = queryBuilder.eq('requires_prescription', requiresPrescription === 'true');
      }

      if (featured === 'true') {
        queryBuilder = queryBuilder.eq('is_featured', true);
      }

      if (categoryId && categoryId !== 'all' && isValidUUID(categoryId)) {
        queryBuilder = queryBuilder.eq('category_id', categoryId);
      }

      const { data, error } = await queryBuilder;

      if (!error && data && data.length > 0) {
        let filtered: Product[] = data;

        // Apply category filter if slug provided
        if (categorySlug && categorySlug !== 'all') {
          if (categorySlug === 'obat-bebas') {
            filtered = filtered.filter((p) => !p.requires_prescription);
          } else if (categorySlug === 'resep' || categorySlug === 'wajib-resep') {
            filtered = filtered.filter((p) => p.requires_prescription);
          } else if (categorySlug === 'promo' || categorySlug === 'promo-spesial') {
            filtered = filtered.filter((p) =>
              p.variants && p.variants.some((v: any) => (v.discount_percentage || 0) > 0)
            );
          } else {
            filtered = filtered.filter(
              (p) =>
                Boolean(
                  p.category?.slug === categorySlug ||
                  p.category_id === categorySlug ||
                  (p.category?.name && p.category.name.toLowerCase().includes(categorySlug.replace(/-/g, ' ')))
                )
            );
          }
        }

        // Apply text query
        if (query) {
          filtered = filtered.filter(
            (p) =>
              p.name.toLowerCase().includes(query) ||
              (p.description && p.description.toLowerCase().includes(query)) ||
              (p.indications && p.indications.toLowerCase().includes(query)) ||
              (p.composition && p.composition.toLowerCase().includes(query)) ||
              (p.manufacturer && p.manufacturer.toLowerCase().includes(query))
          );
        }

        // Apply price range
        if (minPrice !== null) {
          filtered = filtered.filter((p) => {
            const minVPrice = Math.min(...(p.variants?.map((v) => v.price) || [0]));
            return minVPrice >= minPrice;
          });
        }
        if (maxPrice !== null) {
          filtered = filtered.filter((p) => {
            const minVPrice = Math.min(...(p.variants?.map((v) => v.price) || [0]));
            return minVPrice <= maxPrice;
          });
        }

        // Apply sorting
        if (sort === 'termurah') {
          filtered.sort((a, b) => {
            const pA = Math.min(...(a.variants?.map((v) => v.price) || [0]));
            const pB = Math.min(...(b.variants?.map((v) => v.price) || [0]));
            return pA - pB;
          });
        } else if (sort === 'termahal') {
          filtered.sort((a, b) => {
            const pA = Math.max(...(a.variants?.map((v) => v.price) || [0]));
            const pB = Math.max(...(b.variants?.map((v) => v.price) || [0]));
            return pB - pA;
          });
        } else if (sort === 'nama_asc') {
          filtered.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sort === 'nama_desc') {
          filtered.sort((a, b) => b.name.localeCompare(a.name));
        } else if (sort === 'diskon') {
          filtered.sort((a, b) => {
            const dA = Math.max(...(a.variants?.map((v) => v.discount_percentage || 0) || [0]));
            const dB = Math.max(...(b.variants?.map((v) => v.discount_percentage || 0) || [0]));
            return dB - dA;
          });
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
        (p.indications && p.indications.toLowerCase().includes(query)) ||
        (p.manufacturer && p.manufacturer.toLowerCase().includes(query));

      let matchCategory = true;
      if (categorySlug && categorySlug !== 'all') {
        if (categorySlug === 'obat-bebas') {
          matchCategory = !p.requires_prescription;
        } else if (categorySlug === 'resep' || categorySlug === 'wajib-resep') {
          matchCategory = p.requires_prescription;
        } else if (categorySlug === 'vitamin-suplemen') {
          matchCategory = p.category_id === 'c3' || p.category?.slug === 'vitamin-suplemen';
        } else if (categorySlug === 'alat-kesehatan') {
          matchCategory = p.category_id === 'c5' || p.category?.slug === 'alat-kesehatan';
        } else if (categorySlug === 'perawatan-diri') {
          matchCategory = p.category_id === 'c2' || p.category?.slug === 'perawatan-diri';
        } else if (categorySlug === 'ibu-dan-anak') {
          matchCategory = p.category_id === 'c4' || p.category?.slug === 'ibu-dan-anak';
        } else if (categorySlug === 'flu-batuk') {
          matchCategory =
            p.name.toLowerCase().includes('batuk') ||
            p.name.toLowerCase().includes('flu') ||
            p.name.toLowerCase().includes('paracetamol');
        } else if (categorySlug === 'promo' || categorySlug === 'promo-spesial') {
          matchCategory = p.variants.some((v) => (v.discount_percentage || 0) > 0);
        } else {
          matchCategory = Boolean(
            p.category?.slug === categorySlug ||
            p.category_id === categorySlug ||
            (p.category?.name && p.category.name.toLowerCase().includes(categorySlug.replace(/-/g, ' ')))
          );
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

      let matchPrice = true;
      const minVPrice = Math.min(...(p.variants?.map((v) => v.price) || [0]));
      if (minPrice !== null && minVPrice < minPrice) matchPrice = false;
      if (maxPrice !== null && minVPrice > maxPrice) matchPrice = false;

      return matchQuery && matchCategory && matchPrescription && matchFeatured && matchPrice;
    });

    // Apply sorting
    if (sort === 'termurah') {
      result.sort((a, b) => {
        const pA = Math.min(...(a.variants?.map((v) => v.price) || [0]));
        const pB = Math.min(...(b.variants?.map((v) => v.price) || [0]));
        return pA - pB;
      });
    } else if (sort === 'termahal') {
      result.sort((a, b) => {
        const pA = Math.max(...(a.variants?.map((v) => v.price) || [0]));
        const pB = Math.max(...(b.variants?.map((v) => v.price) || [0]));
        return pB - pA;
      });
    } else if (sort === 'nama_asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'nama_desc') {
      result.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sort === 'diskon') {
      result.sort((a, b) => {
        const dA = Math.max(...(a.variants?.map((v) => v.discount_percentage || 0) || [0]));
        const dB = Math.max(...(b.variants?.map((v) => v.discount_percentage || 0) || [0]));
        return dB - dA;
      });
    }

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

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nama produk obat wajib diisi' },
        { status: 400 }
      );
    }

    const newProductId = crypto.randomUUID();
    const slug = `${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-4)}`;

    let resolvedCategoryId: string | null = null;
    const supabase = isSupabaseConfigured() ? await getSupabaseAdminClient(request) : null;

    if (category_id && isValidUUID(category_id)) {
      resolvedCategoryId = category_id;
    } else if (supabase) {
      // Find first category id in Supabase if exists
      const { data: firstCat } = await supabase.from('categories').select('id').limit(1).maybeSingle();
      if (firstCat) resolvedCategoryId = firstCat.id;
    }

    const formattedVariants = (variants && variants.length > 0 ? variants : [
      {
        id: crypto.randomUUID(),
        product_id: newProductId,
        name: 'Unit',
        unit: 'pcs',
        quantity_per_package: 1,
        price: 10000,
        stock: 50,
        is_active: true,
      }
    ]).map((v: any, index: number) => ({
      id: v.id && isValidUUID(v.id) ? v.id : crypto.randomUUID(),
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
      category_id: resolvedCategoryId || category_id || 'c1',
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
      const supabase = await getSupabaseAdminClient();
      // Store in Supabase
      const { data: prodData, error: prodErr } = await supabase
        .from('products')
        .insert([{
          id: newProduct.id,
          name: newProduct.name,
          slug: newProduct.slug,
          description: newProduct.description,
          category_id: resolvedCategoryId,
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

      if (prodErr) {
        console.error('Supabase product insert error:', prodErr);
        return NextResponse.json(
          { success: false, error: prodErr.message || 'Gagal menyimpan produk ke Supabase' },
          { status: 500 }
        );
      }

      if (prodData) {
        // Insert variants
        const { error: varErr } = await supabase.from('product_variants').insert(
          formattedVariants.map((v: any) => ({
            id: v.id,
            product_id: prodData.id,
            name: v.name,
            unit: v.unit,
            quantity_per_package: v.quantity_per_package,
            price: v.price,
            strike_price: v.strike_price || null,
            discount_percentage: v.discount_percentage || 0,
            stock: v.stock,
            is_active: v.is_active,
          }))
        );

        if (varErr) {
          console.error('Supabase variants insert error:', varErr);
          return NextResponse.json(
            { success: false, error: varErr.message || 'Gagal menyimpan varian produk ke Supabase' },
            { status: 500 }
          );
        }

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
