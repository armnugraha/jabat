import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { mockBundlingPackages, mockProducts } from '@/lib/data/mock-data';
import { BundlingPackage, BundlingItem } from '@/lib/types';

export const dynamic = 'force-dynamic';

// In-memory store for fallback mode (starts empty, only holds real bundles created by admin)
let dynamicBundles: BundlingPackage[] = [];

// Helper to compute bundle pricing accurately
function computeBundlePricing(bundle: BundlingPackage, items: BundlingItem[]): BundlingPackage {
  // Sum up true item prices from variants
  const calculatedOriginal = items.reduce((sum, it) => {
    const itemPrice = Number(it.variant?.price) || Number((it as any).price) || 0;
    const qty = Number(it.quantity) || 1;
    return sum + itemPrice * qty;
  }, 0);

  const bundlePrice = Number(bundle.bundle_price) || 0;
  // Use calculatedOriginal if bundle.original_price is 0 or less than bundle_price
  const originalPrice =
    Number(bundle.original_price) > 0 && Number(bundle.original_price) >= bundlePrice
      ? Number(bundle.original_price)
      : calculatedOriginal > 0
      ? calculatedOriginal
      : bundlePrice;

  const savingsAmount = Math.max(0, originalPrice - bundlePrice);
  const savingsPercentage = originalPrice > 0 ? Math.round((savingsAmount / originalPrice) * 100) : 0;

  return {
    ...bundle,
    original_price: originalPrice,
    bundle_price: bundlePrice,
    savings_amount: savingsAmount,
    savings_percentage: savingsPercentage,
    badge: bundle.badge || undefined,
    items,
  };
}

// Helper to populate items with full product & variant information
function populateBundleDetails(bundle: BundlingPackage, allProducts = mockProducts): BundlingPackage {
  const populatedItems: BundlingItem[] = (bundle.items || []).map((item) => {
    const product = item.product || allProducts.find((p) => p.id === item.product_id);
    const variant =
      item.variant ||
      product?.variants?.find((v) => v.id === item.variant_id) ||
      product?.variants?.[0];
    return {
      ...item,
      product,
      variant,
    };
  });

  return computeBundlePricing(bundle, populatedItems);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const productId = searchParams.get('product_id');
    const activeOnly = searchParams.get('active') !== 'false';

    // 1. If Supabase is configured, try Supabase first
    if (isSupabaseConfigured()) {
      try {
        const supabase = await getSupabaseAdminClient();
        let query = supabase.from('bundling_packages').select('*').order('display_order', { ascending: true });

        if (activeOnly) {
          query = query.eq('is_active', true);
        }
        if (category && category !== 'all' && category !== 'Semua') {
          query = query.eq('category', category);
        }

        const { data: dbPackages, error: pkgError } = await query;

        if (!pkgError && Array.isArray(dbPackages)) {
          // If no bundles exist in database, return empty array immediately (do not fallback to mock)
          if (dbPackages.length === 0) {
            return NextResponse.json({
              success: true,
              data: [],
              source: 'supabase',
            });
          }

          // Fetch bundling items
          const bundleIds = dbPackages.map((b) => b.id);
          const { data: dbItems, error: itemsError } = await supabase
            .from('bundling_items')
            .select('*')
            .in('bundle_id', bundleIds);

          // Fetch products for population
          const { data: dbProducts } = await supabase.from('products').select('*, variants:product_variants(*)');
          const productsList = dbProducts || mockProducts;

          let packagesWithItems: BundlingPackage[] = dbPackages.map((pkg) => {
            const items = (dbItems || [])
              .filter((it) => it.bundle_id === pkg.id)
              .map((it) => {
                const prod = productsList.find((p: any) => p.id === it.product_id);
                const vari = prod?.variants?.find((v: any) => v.id === it.variant_id) || prod?.variants?.[0];
                return {
                  ...it,
                  product: prod,
                  variant: vari,
                };
              });

            return computeBundlePricing(pkg, items);
          });

          if (productId) {
            packagesWithItems = packagesWithItems.filter((pkg) =>
              pkg.items.some((it) => it.product_id === productId)
            );
          }

          return NextResponse.json({
            success: true,
            data: packagesWithItems,
            source: 'supabase',
          });
        }
      } catch (sbErr) {
        console.warn('Supabase bundling query failed, using local store:', sbErr);
      }
    }

    // 2. Local fallback
    let result = dynamicBundles.map((b) => populateBundleDetails(b));

    if (activeOnly) {
      result = result.filter((b) => b.is_active);
    }

    if (category && category !== 'all' && category !== 'Semua') {
      result = result.filter(
        (b) => b.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (productId) {
      result = result.filter((b) =>
        b.items.some((it) => it.product_id === productId)
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
      source: 'local_database',
    });
  } catch (err: any) {
    console.error('Bundling GET error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memuat paket bundling' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      category,
      description,
      image_url,
      bundle_price,
      badge,
      items,
      is_active = true,
    } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nama paket bundling wajib diisi' },
        { status: 400 }
      );
    }

    if (!category?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Kategori bundling wajib diisi' },
        { status: 400 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Paket wajib memiliki minimal 1 produk' },
        { status: 400 }
      );
    }

    // Fetch products from database or mock
    let productsList = mockProducts;
    if (isSupabaseConfigured()) {
      try {
        const supabase = await getSupabaseAdminClient();
        const { data: dbProducts } = await supabase.from('products').select('*, variants:product_variants(*)');
        if (dbProducts && dbProducts.length > 0) {
          productsList = dbProducts;
        }
      } catch (e) {}
    }

    // Calculate original price from items
    let calculatedOriginal = 0;
    const formattedItems: BundlingItem[] = items.map((it: any, idx: number) => {
      const prod = productsList.find((p: any) => p.id === it.product_id) || mockProducts.find((p) => p.id === it.product_id);
      const vari = prod?.variants?.find((v: any) => v.id === it.variant_id) || prod?.variants?.[0];
      const itemPrice = Number(it.price) || vari?.price || 0;
      const quantity = Math.max(1, Number(it.quantity) || 1);
      calculatedOriginal += itemPrice * quantity;

      return {
        id: it.id || `bi-${Date.now()}-${idx}`,
        product_id: it.product_id,
        variant_id: it.variant_id || vari?.id || '',
        quantity,
        product: prod,
        variant: vari,
      };
    });

    const originalPrice =
      Number(body.original_price) > 0 ? Number(body.original_price) : calculatedOriginal;
    const finalBundlePrice = Number(bundle_price) > 0 ? Number(bundle_price) : originalPrice;
    const savingsAmount = Math.max(0, originalPrice - finalBundlePrice);
    const savingsPercentage = originalPrice > 0 ? Math.round((savingsAmount / originalPrice) * 100) : 0;

    const bundleId = `bundle-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const slug = `${name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-4)}`;

    const newBundle: BundlingPackage = {
      id: bundleId,
      name: name.trim(),
      slug,
      category: category.trim(),
      description: description?.trim() || '',
      image_url:
        image_url ||
        formattedItems[0]?.product?.image_url ||
        'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80',
      original_price: originalPrice,
      bundle_price: finalBundlePrice,
      savings_amount: savingsAmount,
      savings_percentage: savingsPercentage,
      badge: badge?.trim() || undefined,
      is_active: is_active ?? true,
      display_order: dynamicBundles.length + 1,
      items: formattedItems.map((it) => ({ ...it, bundle_id: bundleId })),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Try Supabase insert
    if (isSupabaseConfigured()) {
      try {
        const supabase = await getSupabaseAdminClient();
        const { error: pkgErr } = await supabase.from('bundling_packages').insert({
          id: newBundle.id,
          name: newBundle.name,
          slug: newBundle.slug,
          category: newBundle.category,
          description: newBundle.description,
          image_url: newBundle.image_url,
          original_price: newBundle.original_price,
          bundle_price: newBundle.bundle_price,
          savings_amount: newBundle.savings_amount,
          savings_percentage: newBundle.savings_percentage,
          badge: newBundle.badge,
          is_active: newBundle.is_active,
          display_order: newBundle.display_order,
        });

        if (!pkgErr) {
          const itemsToInsert = newBundle.items.map((it) => ({
            id: it.id,
            bundle_id: newBundle.id,
            product_id: it.product_id,
            variant_id: it.variant_id,
            quantity: it.quantity,
          }));

          await supabase.from('bundling_items').insert(itemsToInsert);
        }
      } catch (sbErr) {
        console.warn('Supabase bundle insert notice:', sbErr);
      }
    }

    // Always update local dynamic store
    dynamicBundles = [newBundle, ...dynamicBundles];

    return NextResponse.json({
      success: true,
      data: newBundle,
      message: 'Paket bundling berhasil ditambahkan',
    });
  } catch (err: any) {
    console.error('Bundling POST error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal membuat paket bundling' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      category,
      description,
      image_url,
      bundle_price,
      badge,
      items,
      is_active,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID paket bundling diperlukan' },
        { status: 400 }
      );
    }

    let existingIndex = dynamicBundles.findIndex((b) => b.id === id);
    let existing = existingIndex > -1 ? dynamicBundles[existingIndex] : undefined;

    if (!existing && isSupabaseConfigured()) {
      try {
        const supabase = await getSupabaseAdminClient();
        const { data: dbPkg } = await supabase
          .from('bundling_packages')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (dbPkg) {
          existing = dbPkg;
        }
      } catch (e) {}
    }

    // Fetch products from database or mock
    let productsList = mockProducts;
    if (isSupabaseConfigured()) {
      try {
        const supabase = await getSupabaseAdminClient();
        const { data: dbProducts } = await supabase.from('products').select('*, variants:product_variants(*)');
        if (dbProducts && dbProducts.length > 0) {
          productsList = dbProducts;
        }
      } catch (e) {}
    }

    // Calculate price
    let calculatedOriginal = 0;
    const formattedItems: BundlingItem[] = (items || existing?.items || []).map((it: any, idx: number) => {
      const prod = productsList.find((p: any) => p.id === it.product_id) || mockProducts.find((p) => p.id === it.product_id);
      const vari = prod?.variants?.find((v: any) => v.id === it.variant_id) || prod?.variants?.[0];
      const itemPrice = Number(it.price) || vari?.price || 0;
      const quantity = Math.max(1, Number(it.quantity) || 1);
      calculatedOriginal += itemPrice * quantity;

      return {
        id: it.id || `bi-${Date.now()}-${idx}`,
        bundle_id: id,
        product_id: it.product_id,
        variant_id: it.variant_id || vari?.id || '',
        quantity,
        product: prod,
        variant: vari,
      };
    });

    const originalPrice =
      Number(body.original_price) > 0 ? Number(body.original_price) : calculatedOriginal > 0 ? calculatedOriginal : existing?.original_price || 0;
    const finalBundlePrice =
      bundle_price !== undefined ? Number(bundle_price) : existing?.bundle_price || originalPrice;
    const savingsAmount = Math.max(0, originalPrice - finalBundlePrice);
    const savingsPercentage = originalPrice > 0 ? Math.round((savingsAmount / originalPrice) * 100) : 0;

    // Preserve existing badge unless explicitly passed in body
    const finalBadge =
      badge !== undefined
        ? (badge && typeof badge === 'string' && badge.trim().length > 0 ? badge.trim() : undefined)
        : existing?.badge;

    const updatedBundle: BundlingPackage = {
      ...(existing || {}),
      id,
      name: name !== undefined ? name.trim() : existing?.name || '',
      slug: existing?.slug || `bundle-${id}`,
      category: category !== undefined ? category.trim() : existing?.category || 'Umum',
      description: description !== undefined ? description.trim() : existing?.description || '',
      image_url: image_url || existing?.image_url,
      original_price: originalPrice,
      bundle_price: finalBundlePrice,
      savings_amount: savingsAmount,
      savings_percentage: savingsPercentage,
      badge: finalBadge,
      is_active: is_active !== undefined ? is_active : existing?.is_active ?? true,
      display_order: existing?.display_order || 1,
      items: formattedItems,
      updated_at: new Date().toISOString(),
    };

    if (existingIndex > -1) {
      dynamicBundles[existingIndex] = updatedBundle;
    } else {
      dynamicBundles.push(updatedBundle);
    }

    // Try Supabase update
    if (isSupabaseConfigured()) {
      try {
        const supabase = await getSupabaseAdminClient();
        const fieldsToUpdate: any = {
          updated_at: updatedBundle.updated_at,
        };
        if (is_active !== undefined) fieldsToUpdate.is_active = is_active;
        if (name !== undefined) fieldsToUpdate.name = updatedBundle.name;
        if (category !== undefined) fieldsToUpdate.category = updatedBundle.category;
        if (description !== undefined) fieldsToUpdate.description = updatedBundle.description;
        if (image_url !== undefined) fieldsToUpdate.image_url = updatedBundle.image_url;
        if (bundle_price !== undefined) fieldsToUpdate.bundle_price = updatedBundle.bundle_price;
        if (body.original_price !== undefined || items !== undefined) {
          fieldsToUpdate.original_price = updatedBundle.original_price;
          fieldsToUpdate.savings_amount = updatedBundle.savings_amount;
          fieldsToUpdate.savings_percentage = updatedBundle.savings_percentage;
        }
        if (badge !== undefined) {
          fieldsToUpdate.badge = finalBadge || null;
        }

        await supabase
          .from('bundling_packages')
          .update(fieldsToUpdate)
          .eq('id', id);

        if (items) {
          await supabase.from('bundling_items').delete().eq('bundle_id', id);
          const itemsToInsert = formattedItems.map((it) => ({
            id: it.id,
            bundle_id: id,
            product_id: it.product_id,
            variant_id: it.variant_id,
            quantity: it.quantity,
          }));
          await supabase.from('bundling_items').insert(itemsToInsert);
        }
      } catch (sbErr) {
        console.warn('Supabase bundle update notice:', sbErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: updatedBundle,
      message: 'Paket bundling berhasil diperbarui',
    });
  } catch (err: any) {
    console.error('Bundling PUT error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memperbarui paket bundling' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID paket bundling diperlukan' },
        { status: 400 }
      );
    }

    dynamicBundles = dynamicBundles.filter((b) => b.id !== id);

    if (isSupabaseConfigured()) {
      try {
        const supabase = await getSupabaseAdminClient();
        await supabase.from('bundling_packages').delete().eq('id', id);
      } catch (sbErr) {
        console.warn('Supabase bundle delete notice:', sbErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Paket bundling berhasil dihapus',
    });
  } catch (err: any) {
    console.error('Bundling DELETE error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal menghapus paket bundling' },
      { status: 500 }
    );
  }
}
