import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { mockProducts } from '@/lib/data/mock-data';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({
        success: true,
        items: {},
        hasUnavailable: false,
        unavailableList: [],
      });
    }

    // Fetch all products with variants from Supabase (fallback to mock)
    let allProducts = mockProducts;
    let allBundles: any[] = [];

    if (isSupabaseConfigured()) {
      try {
        const supabase = await getSupabaseAdminClient();
        const { data: dbProducts } = await supabase
          .from('products')
          .select('*, variants:product_variants(*)');
        if (dbProducts && dbProducts.length > 0) {
          allProducts = dbProducts;
        }

        const { data: dbBundles } = await supabase
          .from('bundling_packages')
          .select('*, items:bundling_items(*)');
        if (dbBundles) {
          allBundles = dbBundles;
        }
      } catch (e) {
        console.warn('Cart validate database query error:', e);
      }
    }

    // Also fetch local bundles from internal API if Supabase returned 0 bundles or is not configured
    if (allBundles.length === 0) {
      try {
        const bundleRes = await fetch(new URL('/api/bundling?active=false', request.url));
        const bundleJson = await bundleRes.json();
        if (bundleJson.success && Array.isArray(bundleJson.data)) {
          allBundles = bundleJson.data;
        }
      } catch (e) {}
    }

    const validations: Record<
      string,
      {
        available: boolean;
        reason: string | null;
        currentStock?: number;
        currentPrice?: number;
        name: string;
      }
    > = {};

    const unavailableList: { id: string; name: string; reason: string }[] = [];

    for (const item of items) {
      const itemId = item.id;
      const itemName = item.bundle?.name || item.product?.name || 'Produk';

      if (item.is_bundle) {
        const rawBundleId = item.bundle?.id || item.id.replace(/^bundle-/, '');
        const bundle = allBundles.find((b) => b.id === rawBundleId || `bundle-${b.id}` === item.id);

        if (!bundle) {
          validations[itemId] = {
            available: false,
            reason: 'Paket bundling ini sudah tidak tersedia atau telah dihapus oleh apotek',
            name: itemName,
          };
          unavailableList.push({ id: itemId, name: itemName, reason: validations[itemId].reason! });
          continue;
        }

        if (bundle.is_active === false) {
          validations[itemId] = {
            available: false,
            reason: 'Paket bundling ini sedang dinonaktifkan oleh apotek',
            name: itemName,
          };
          unavailableList.push({ id: itemId, name: itemName, reason: validations[itemId].reason! });
          continue;
        }

        // Check each product inside bundle
        let bundleItemsAvailable = true;
        let failReason = '';

        const bundleInnerItems = bundle.items || item.bundle?.items || [];
        for (const bIt of bundleInnerItems) {
          const prod = allProducts.find((p) => p.id === bIt.product_id);
          if (!prod || prod.is_active === false) {
            bundleItemsAvailable = false;
            failReason = `Produk "${prod?.name || 'isi paket'}" dalam bundling ini sedang dinonaktifkan`;
            break;
          }
          const vari = prod.variants?.find((v: any) => v.id === bIt.variant_id) || prod.variants?.[0];
          if (!vari || vari.is_active === false) {
            bundleItemsAvailable = false;
            failReason = `Varian produk "${prod.name}" dalam bundling ini sedang dinonaktifkan`;
            break;
          }
          const reqQty = (bIt.quantity || 1) * (item.quantity || 1);
          if (vari.stock !== undefined && vari.stock < reqQty) {
            bundleItemsAvailable = false;
            failReason = `Stok "${prod.name}" (${vari.stock}) tidak mencukupi untuk paket bundling ini`;
            break;
          }
        }

        if (!bundleItemsAvailable) {
          validations[itemId] = {
            available: false,
            reason: failReason,
            name: itemName,
          };
          unavailableList.push({ id: itemId, name: itemName, reason: failReason });
        } else {
          validations[itemId] = {
            available: true,
            reason: null,
            name: itemName,
            currentPrice: bundle.bundle_price,
          };
        }
      } else {
        // Regular product variant
        const prod = allProducts.find((p) => p.id === item.product?.id || p.id === item.productId);

        if (!prod) {
          validations[itemId] = {
            available: false,
            reason: 'Produk sudah tidak terdaftar di apotek',
            name: itemName,
          };
          unavailableList.push({ id: itemId, name: itemName, reason: validations[itemId].reason! });
          continue;
        }

        if (prod.is_active === false) {
          validations[itemId] = {
            available: false,
            reason: 'Produk ini sedang dinonaktifkan oleh apotek',
            name: itemName,
          };
          unavailableList.push({ id: itemId, name: itemName, reason: validations[itemId].reason! });
          continue;
        }

        const vari = prod.variants?.find((v: any) => v.id === item.variant?.id || v.id === item.variantId) || prod.variants?.[0];

        if (!vari) {
          validations[itemId] = {
            available: false,
            reason: 'Kemasan atau varian produk sudah tidak tersedia',
            name: itemName,
          };
          unavailableList.push({ id: itemId, name: itemName, reason: validations[itemId].reason! });
          continue;
        }

        if (vari.is_active === false) {
          validations[itemId] = {
            available: false,
            reason: 'Kemasan produk ini sedang dinonaktifkan oleh apotek',
            name: itemName,
          };
          unavailableList.push({ id: itemId, name: itemName, reason: validations[itemId].reason! });
          continue;
        }

        if (vari.stock !== undefined && vari.stock <= 0) {
          validations[itemId] = {
            available: false,
            reason: 'Stok produk ini sedang habis',
            name: itemName,
            currentStock: 0,
          };
          unavailableList.push({ id: itemId, name: itemName, reason: validations[itemId].reason! });
          continue;
        }

        validations[itemId] = {
          available: true,
          reason: null,
          name: itemName,
          currentStock: vari.stock,
          currentPrice: vari.price,
        };
      }
    }

    return NextResponse.json({
      success: true,
      items: validations,
      hasUnavailable: unavailableList.length > 0,
      unavailableList,
    });
  } catch (err: any) {
    console.error('Cart validate error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memvalidasi keranjang' },
      { status: 500 }
    );
  }
}
