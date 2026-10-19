import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (isSupabaseConfigured()) {
      // Fetch customer profiles
      const { data: profiles, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'customer')
        .order('created_at', { ascending: false });

      // Fetch customer orders for aggregations
      const { data: orders } = await supabase
        .from('orders')
        .select('id, customer_id, total, status, created_at');

      if (!profileErr && profiles && profiles.length > 0) {
        const aggregated = profiles.map((p) => {
          const userOrders = (orders || []).filter((o) => o.customer_id === p.id && o.status !== 'cancelled');
          const totalSpend = userOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
          const lastOrderDate = userOrders.length > 0 ? userOrders[0].created_at : p.created_at;

          return {
            id: p.id,
            name: p.full_name,
            phone: p.phone || 'Belum diatur',
            email: p.email || '',
            avatar_url: p.avatar_url,
            ordersCount: userOrders.length,
            totalSpend,
            lastOrder: new Date(lastOrderDate).toLocaleDateString('id-ID', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            }),
          };
        });

        return NextResponse.json({
          success: true,
          data: aggregated,
          source: 'supabase',
        });
      }
    }

    // Fallback if database empty
    return NextResponse.json({
      success: true,
      data: [
        {
          id: 'u1000000-0000-0000-0000-000000000001',
          name: 'Budi Santoso',
          phone: '0812-3456-7890',
          email: 'pasien@jabat.id',
          ordersCount: 1,
          totalSpend: 72000,
          lastOrder: '05 Okt 2026',
        },
      ],
      source: 'local_fallback',
    });
  } catch (err: any) {
    console.error('Customers GET error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal mengambil data pelanggan' },
      { status: 500 }
    );
  }
}
