import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (isSupabaseConfigured()) {
      try {
        const supabase = await getSupabaseAdminClient();
        let { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            customer:profiles!customer_id (id, full_name, phone),
            items:order_items(*)
          `)
          .or(`id.eq.${id},order_number.eq.${id}`)
          .maybeSingle();

        if (error || !data) {
          const fallback = await supabase
            .from('orders')
            .select(`
              *,
              items:order_items(*)
            `)
            .or(`id.eq.${id},order_number.eq.${id}`)
            .maybeSingle();
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
    const { status, prescriptionStatus, paymentStatus } = body;

    const updates: any = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (prescriptionStatus) updates.prescription_status = prescriptionStatus;
    if (paymentStatus) {
      updates.payment_status = paymentStatus;
    } else if (status === 'confirmed') {
      // Ketika pesanan dikonfirmasi oleh admin, otomatis set payment_status ke paid (lunas)
      updates.payment_status = 'paid';
    }

    if (isSupabaseConfigured()) {
      const supabase = await getSupabaseAdminClient();
      await supabase
        .from('orders')
        .update(updates)
        .or(`id.eq.${id},order_number.eq.${id}`);
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

