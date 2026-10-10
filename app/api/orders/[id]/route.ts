import { NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (isSupabaseConfigured()) {
      try {
        const supabase = await getSupabaseAdminClient();
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            items:order_items(*)
          `)
          .or(`id.eq.${id},order_number.eq.${id}`)
          .single();

        if (data && !error) {
          return NextResponse.json({ success: true, data });
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
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, prescriptionStatus, paymentStatus } = body;

    const updates: any = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (prescriptionStatus) updates.prescription_status = prescriptionStatus;
    if (paymentStatus) updates.payment_status = paymentStatus;

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

