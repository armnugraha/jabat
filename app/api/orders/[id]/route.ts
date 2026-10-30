import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { mockOrders, mockProducts } from '@/lib/data/mock-data';
import { isValidUUID } from '@/lib/utils';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (isSupabaseConfigured()) {
      try {
        const supabase = await getSupabaseAdminClient();
        let query = supabase
          .from('orders')
          .select(`
            *,
            customer:profiles!customer_id (id, full_name, phone),
            items:order_items(*)
          `);

        if (isValidUUID(id)) {
          query = query.eq('id', id);
        } else {
          query = query.eq('order_number', id);
        }

        let { data, error } = await query.maybeSingle();

        if (error || !data) {
          let fallbackQuery = supabase
            .from('orders')
            .select(`
              *,
              items:order_items(*)
            `);
          if (isValidUUID(id)) {
            fallbackQuery = fallbackQuery.eq('id', id);
          } else {
            fallbackQuery = fallbackQuery.eq('order_number', id);
          }
          const fallback = await fallbackQuery.maybeSingle();
          if (fallback.data) {
            data = fallback.data;
          }
        }

        if (data) {
          const addr = typeof data.delivery_address === 'string'
            ? (() => { try { return JSON.parse(data.delivery_address); } catch { return {}; } })()
            : (data.delivery_address || {});
          const customerName =
            data.customer?.full_name ||
            data.customer_name ||
            addr.recipient_name ||
            'Pelanggan Apotek';
          const customerPhone =
            data.customer?.phone ||
            data.customer_phone ||
            addr.phone ||
            '-';

          return NextResponse.json({
            success: true,
            data: {
              ...data,
              customer_name: customerName,
              customer_phone: customerPhone,
              delivery_address: addr,
            },
          });
        }
      } catch (dbErr) {
        console.warn('Supabase fetch order by id notice:', dbErr);
      }
    }

    // Fallback: check in-memory / mock orders
    const mockOrder = mockOrders.find((o) => o.id === id || o.order_number === id);
    if (mockOrder) {
      return NextResponse.json({
        success: true,
        data: mockOrder,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Pesanan tidak ditemukan.' },
      { status: 404 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memuat detail pesanan.' },
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
    const status = body.status;
    const prescriptionStatus = body.prescriptionStatus || body.prescription_status;
    const paymentStatus = body.paymentStatus || body.payment_status;

    const updates: any = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (prescriptionStatus) updates.prescription_status = prescriptionStatus;

    if (paymentStatus) {
      updates.payment_status = paymentStatus;
    } else if (status === 'confirmed') {
      // Ketika pesanan dikonfirmasi oleh admin, otomatis set payment_status ke paid (lunas)
      updates.payment_status = 'paid';
    } else if (status === 'cancelled') {
      // Ketika pesanan dibatalkan, otomatis set payment_status ke cancelled (batal)
      updates.payment_status = 'cancelled';
    }

    const confirmedStatuses = ['confirmed', 'preparing', 'out_for_delivery', 'completed'];

    if (isSupabaseConfigured()) {
      const supabase = await getSupabaseAdminClient();

      // 1. Ambil data pesanan saat ini untuk memeriksa status sebelumnya & ID pesanan database
      let currentOrderQuery = supabase
        .from('orders')
        .select('id, status, order_number');

      if (isValidUUID(id)) {
        currentOrderQuery = currentOrderQuery.eq('id', id);
      } else {
        currentOrderQuery = currentOrderQuery.eq('order_number', id);
      }

      const { data: currentOrder } = await currentOrderQuery.maybeSingle();

      const previousStatus = currentOrder?.status;
      const orderDbId = currentOrder?.id || (isValidUUID(id) ? id : null);

      const isNowConfirmed = status && confirmedStatuses.includes(status);
      const wasAlreadyConfirmed = previousStatus && confirmedStatuses.includes(previousStatus);

      // 2. Jika status berubah menjadi confirmed (dan sebelumnya belum confirmed), kurangi stok varian obat
      if (isNowConfirmed && !wasAlreadyConfirmed && orderDbId) {
        const { data: items } = await supabase
          .from('order_items')
          .select('variant_id, product_id, quantity')
          .eq('order_id', orderDbId);

        if (items && items.length > 0) {
          for (const item of items) {
            if (item.variant_id) {
              const { data: v } = await supabase
                .from('product_variants')
                .select('id, stock')
                .eq('id', item.variant_id)
                .maybeSingle();

              if (v) {
                const currentStock = Number(v.stock) || 0;
                const qtyToDeduct = Number(item.quantity) || 1;
                const newStock = Math.max(0, currentStock - qtyToDeduct);

                await supabase
                  .from('product_variants')
                  .update({ stock: newStock })
                  .eq('id', item.variant_id);
              }
            }
          }
        }
      } else if (status === 'cancelled' && wasAlreadyConfirmed && orderDbId) {
        // Jika pesanan yang sebelumnya sudah confirmed dibatalkan, kembalikan stok obat ke semula
        const { data: items } = await supabase
          .from('order_items')
          .select('variant_id, product_id, quantity')
          .eq('order_id', orderDbId);

        if (items && items.length > 0) {
          for (const item of items) {
            if (item.variant_id) {
              const { data: v } = await supabase
                .from('product_variants')
                .select('id, stock')
                .eq('id', item.variant_id)
                .maybeSingle();

              if (v) {
                const currentStock = Number(v.stock) || 0;
                const qtyToRestore = Number(item.quantity) || 1;
                const newStock = currentStock + qtyToRestore;

                await supabase
                  .from('product_variants')
                  .update({ stock: newStock })
                  .eq('id', item.variant_id);
              }
            }
          }
        }
      }

      // 3. Update orders record di Supabase
      let orderUpdateQuery = supabase.from('orders').update(updates);
      if (isValidUUID(id)) {
        orderUpdateQuery = orderUpdateQuery.eq('id', id);
      } else {
        orderUpdateQuery = orderUpdateQuery.eq('order_number', id);
      }
      await orderUpdateQuery;
    }

    // Selalu sinkronkan juga ke mockOrders dan mockProducts untuk fallback local
    const targetMock = mockOrders.find((o) => o.id === id || o.order_number === id);
    if (targetMock) {
      const prevStatus = targetMock.status;
      const wasConfirmed = prevStatus && confirmedStatuses.includes(prevStatus);
      const isConfirmed = status && confirmedStatuses.includes(status);

      if (status) targetMock.status = status;
      if (prescriptionStatus) targetMock.prescription_status = prescriptionStatus;
      if (updates.payment_status) targetMock.payment_status = updates.payment_status;

      if (isConfirmed && !wasConfirmed) {
        for (const item of targetMock.items || []) {
          for (const prod of mockProducts) {
            const v = prod.variants.find((vr) => vr.id === item.variant_id);
            if (v) {
              v.stock = Math.max(0, (v.stock || 0) - (Number(item.quantity) || 1));
            }
          }
        }
      } else if (status === 'cancelled' && wasConfirmed) {
        for (const item of targetMock.items || []) {
          for (const prod of mockProducts) {
            const v = prod.variants.find((vr) => vr.id === item.variant_id);
            if (v) {
              v.stock = (v.stock || 0) + (Number(item.quantity) || 1);
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Status pesanan berhasil diperbarui.',
      data: { id, ...updates },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memperbarui pesanan.' },
      { status: 500 }
    );
  }
}
