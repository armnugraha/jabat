import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { mockOrders } from '@/lib/data/mock-data';

export const dynamic = 'force-dynamic';

// Global server in-memory order cache to supplement Supabase realtime orders
let inMemoryOrders: any[] = [];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role') || 'customer';

    if (isSupabaseConfigured()) {
      try {
        const supabase = await getSupabaseAdminClient();
        let query = supabase
          .from('orders')
          .select(`
            *,
            customer:profiles!customer_id (id, full_name, phone),
            items:order_items(*)
          `)
          .order('created_at', { ascending: false });

        if (role === 'customer' && userId) {
          query = query.eq('customer_id', userId);
        }

        let { data, error } = await query;
        if (error) {
          const fallbackQuery = supabase
            .from('orders')
            .select(`
              *,
              items:order_items(*)
            `)
            .order('created_at', { ascending: false });
          if (role === 'customer' && userId) {
            fallbackQuery.eq('customer_id', userId);
          }
          const fbRes = await fallbackQuery;
          if (fbRes.data) {
            data = fbRes.data;
            error = null;
          }
        }

        if (!error && data) {
          const normalized = data.map((ord: any) => {
            const addr = typeof ord.delivery_address === 'string'
              ? (() => { try { return JSON.parse(ord.delivery_address); } catch { return {}; } })()
              : (ord.delivery_address || {});
            const customerName =
              ord.customer?.full_name ||
              ord.customer_name ||
              addr.recipient_name ||
              'Pelanggan Apotek';
            const customerPhone =
              ord.customer?.phone ||
              ord.customer_phone ||
              addr.phone ||
              '-';

            return {
              ...ord,
              customer_name: customerName,
              customer_phone: customerPhone,
              delivery_address: addr,
            };
          });

          // Combine with any in-memory orders created for this user/session
          const combined = [...normalized];
          for (const imo of inMemoryOrders) {
            if (role !== 'customer' || imo.customer_id === userId) {
              if (!combined.some((o) => o.id === imo.id || o.order_number === imo.order_number)) {
                combined.unshift(imo);
              }
            }
          }
          return NextResponse.json({ success: true, data: combined });
        }
      } catch (dbErr) {
        console.warn('Supabase orders fetch notice:', dbErr);
      }
    }

    // Fallback filtered by userId
    const userOrders = inMemoryOrders.filter((ord) => {
      if (role !== 'customer') return true;
      return ord.customer_id === userId;
    });

    return NextResponse.json({ success: true, data: userOrders });
  } catch (err: any) {
    console.error('Orders GET API error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal mengambil data pesanan.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customerId,
      customerName,
      customerPhone,
      items,
      subtotal,
      discount,
      deliveryFee,
      total,
      deliveryOption,
      deliveryAddress,
      paymentMethod,
      customerNotes,
      requiresPrescription,
    } = body;

    if (!customerId || !items || !items.length) {
      return NextResponse.json(
        { success: false, error: 'Data pesanan tidak lengkap (customerId / items kosong).' },
        { status: 400 }
      );
    }

    // Validate that all items are active, available, and have sufficient stock
    if (isSupabaseConfigured()) {
      try {
        const supabase = await getSupabaseAdminClient();
        for (const it of items) {
          const isBundle = it.is_bundle || String(it.product?.id || '').startsWith('bundle-');
          if (isBundle) {
            const rawBundleId = it.bundle?.id || String(it.product?.id || it.productId || '').replace(/^bundle-/, '');
            const { data: bPkg } = await supabase
              .from('bundling_packages')
              .select('id, name, is_active')
              .eq('id', rawBundleId)
              .maybeSingle();

            if (!bPkg) {
              return NextResponse.json(
                { success: false, error: `Paket bundling "${it.product?.name || 'Paket'}" sudah tidak tersedia di apotek.` },
                { status: 400 }
              );
            }
            if (bPkg.is_active === false) {
              return NextResponse.json(
                { success: false, error: `Paket bundling "${bPkg.name}" sedang dinonaktifkan oleh apotek. Silakan periksa keranjang Anda.` },
                { status: 400 }
              );
            }
          } else {
            const prodId = it.product?.id || it.productId;
            const variId = it.variant?.id || it.variantId;
            const { data: prod } = await supabase
              .from('products')
              .select('id, name, is_active, variants:product_variants(*)')
              .eq('id', prodId)
              .maybeSingle();

            if (!prod) {
              return NextResponse.json(
                { success: false, error: `Produk "${it.product?.name || 'Obat'}" sudah tidak terdaftar di apotek.` },
                { status: 400 }
              );
            }
            if (prod.is_active === false) {
              return NextResponse.json(
                { success: false, error: `Produk "${prod.name}" sedang dinonaktifkan oleh apotek.` },
                { status: 400 }
              );
            }

            const vari = prod.variants?.find((v: any) => v.id === variId) || prod.variants?.[0];
            if (!vari || vari.is_active === false) {
              return NextResponse.json(
                { success: false, error: `Varian produk "${prod.name}" sedang dinonaktifkan oleh apotek.` },
                { status: 400 }
              );
            }
            if (vari.stock !== undefined && vari.stock < (it.quantity || 1)) {
              return NextResponse.json(
                { success: false, error: `Stok untuk "${prod.name}" (${vari.name}) tidak mencukupi (sisa stok: ${vari.stock}).` },
                { status: 400 }
              );
            }
          }
        }
      } catch (valErr) {
        console.warn('Orders item validation warning:', valErr);
      }
    }

    const orderNumber = `ASM-${Date.now().toString().slice(-6)}`;
    const orderId = `ord-${Date.now()}`;

    // Flow status: Jika customer pilih qris atau bank_transfer, statusnya sedang dikonfirmasi dulu dan harus dicek admin
    const isQrisOrTransfer = paymentMethod === 'qris' || paymentMethod === 'bank_transfer';
    const initialStatus = requiresPrescription ? 'prescription_review' : 'pending';
    const initialPaymentStatus = isQrisOrTransfer
      ? 'waiting_confirmation'
      : (paymentMethod === 'cod' ? 'pending' : 'waiting_confirmation');

    const resolvedRecipientName = customerName || deliveryAddress?.recipient_name || 'Pelanggan Apotek';
    const resolvedPhone = customerPhone || deliveryAddress?.phone || '-';

    const formattedOrder = {
      id: orderId,
      order_number: orderNumber,
      customer_id: customerId,
      customer_name: resolvedRecipientName,
      customer_phone: resolvedPhone,
      status: initialStatus,
      payment_method: paymentMethod || 'qris',
      payment_status: initialPaymentStatus,
      subtotal: Number(subtotal) || 0,
      discount: Number(discount) || 0,
      delivery_fee: Number(deliveryFee) || 0,
      total: Number(total) || 0,
      delivery_option: deliveryOption || 'express',
      delivery_address: deliveryAddress || {
        recipient_name: resolvedRecipientName,
        phone: resolvedPhone,
        address_line: 'Tebet Barat, Jakarta Selatan',
      },
      customer_note: customerNotes || '',
      requires_prescription: Boolean(requiresPrescription),
      prescription_status: requiresPrescription ? 'pending' : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      items: items.map((it: any, idx: number) => ({
        id: `oi-${Date.now()}-${idx}`,
        order_id: orderId,
        product_id: it.product?.id || it.productId,
        variant_id: it.variant?.id || it.variantId,
        product_name_snapshot: it.product?.name || it.productName || 'Obat Farmasi',
        variant_name_snapshot: it.variant?.name || it.variantName || 'Kemasan Standar',
        unit_snapshot: it.variant?.unit || it.unit || 'unit',
        quantity_per_package_snapshot: it.variant?.quantity_per_package || 1,
        price_snapshot: it.variant?.price || it.price || 0,
        quantity: it.quantity || 1,
        discount: 0,
        subtotal: (it.variant?.price || it.price || 0) * (it.quantity || 1),
        created_at: new Date().toISOString(),
      })),
    };

    // Save to in-memory store
    inMemoryOrders.unshift(formattedOrder);
    mockOrders.unshift(formattedOrder as any);

    // Also attempt inserting into Supabase database
    if (isSupabaseConfigured()) {
      try {
        const supabase = await getSupabaseAdminClient();
        const { data: dbOrder, error: orderErr } = await supabase
          .from('orders')
          .insert({
            order_number: orderNumber,
            customer_id: customerId,
            status: formattedOrder.status,
            payment_method: formattedOrder.payment_method,
            payment_status: formattedOrder.payment_status,
            subtotal: formattedOrder.subtotal,
            discount: formattedOrder.discount,
            delivery_fee: formattedOrder.delivery_fee,
            total: formattedOrder.total,
            delivery_option: formattedOrder.delivery_option,
            delivery_address: formattedOrder.delivery_address,
            customer_note: formattedOrder.customer_note,
            requires_prescription: formattedOrder.requires_prescription,
            prescription_status: formattedOrder.prescription_status,
          })
          .select()
          .single();

        if (dbOrder && !orderErr) {
          const itemsToInsert = formattedOrder.items.map((item: any) => ({
            order_id: dbOrder.id,
            product_id: item.product_id,
            variant_id: item.variant_id,
            product_name_snapshot: item.product_name_snapshot,
            variant_name_snapshot: item.variant_name_snapshot,
            unit_snapshot: item.unit_snapshot,
            quantity_per_package_snapshot: item.quantity_per_package_snapshot,
            price_snapshot: item.price_snapshot,
            quantity: item.quantity,
            discount: item.discount,
            subtotal: item.subtotal,
          }));

          await supabase.from('order_items').insert(itemsToInsert);
          formattedOrder.id = dbOrder.id;
        }
      } catch (dbErr) {
        console.warn('Supabase order insert notice:', dbErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: formattedOrder,
      message: 'Pesanan berhasil dibuat.',
    });
  } catch (err: any) {
    console.error('Order creation error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal membuat pesanan.' },
      { status: 500 }
    );
  }
}
