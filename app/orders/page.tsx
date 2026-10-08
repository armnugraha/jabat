'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  Clock,
  CheckCircle2,
  ChevronRight,
  Package,
  Bike,
  ShieldAlert,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Header } from '@/components/customer/Header';
import { BottomNav } from '@/components/customer/BottomNav';
import { AuthRequiredCard } from '@/components/customer/AuthRequiredCard';
import { Order } from '@/lib/types';
import { formatRupiah, getOrderStatusBadge } from '@/lib/utils';
import { useAuth } from '@/lib/store/auth-context';

function OrdersContent() {
  const searchParams = useSearchParams();
  const placed = searchParams.get('placed');
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'completed' | 'prescription'>('all');

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetch(`/api/orders?userId=${user.id}&role=${user.role}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setOrders(json.data);
        }
      })
      .catch((err) => console.error('Failed to fetch orders:', err))
      .finally(() => setIsLoading(false));
  }, [user]);

  const filteredOrders = orders.filter((ord) => {
    if (activeFilter === 'active') {
      return ['pending', 'waiting_prescription', 'prescription_review', 'confirmed', 'preparing', 'out_for_delivery'].includes(ord.status);
    }
    if (activeFilter === 'completed') {
      return ord.status === 'completed';
    }
    if (activeFilter === 'prescription') {
      return ord.requires_prescription;
    }
    return true;
  });

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-24">
      <Header />

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 md:px-8 space-y-4 pt-4">
        {/* If user is NOT logged in, require authentication */}
        {!user ? (
          <AuthRequiredCard
            icon={FileText}
            title="Masuk untuk Melihat Pesanan Obat"
            description="Pantau proses penyiapan obat, verifikasi resep dokter, dan lacak posisi pengantaran kurir apotek secara real-time."
            badge="Riwayat Pesanan Pasien"
          />
        ) : (
          <>
            {/* Order Success Notice if just placed */}
            {placed && (
              <div className="p-4 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2 animate-in fade-in">
                <div className="flex items-center gap-2 font-bold text-xs text-emerald-800">
                  <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                  <span>Pesanan Berhasil Dibuat!</span>
                </div>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  Apoteker kami sedang menyiapkan obat sesuai standar farmasi. Anda dapat memantau status pesanan secara berkala di halaman ini.
                </p>
              </div>
            )}

            {/* Section Title */}
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Riwayat & Status Pesanan
                </h2>
                <p className="text-[10px] text-slate-500">
                  Daftar seluruh transaksi obat dan tebus resep Anda ({user.full_name})
                </p>
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
              {[
                { id: 'all', label: 'Semua Pesanan' },
                { id: 'active', label: 'Sedang Berjalan' },
                { id: 'prescription', label: 'Pesanan Resep' },
                { id: 'completed', label: 'Selesai' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id as any)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                    activeFilter === tab.id
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Order Cards */}
            <div className="space-y-3">
              {isLoading ? (
                <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400 bg-white rounded-3xl border border-slate-200/80">
                  <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
                  <span className="text-xs font-medium">Memuat riwayat pesanan Anda...</span>
                </div>
              ) : filteredOrders.length > 0 ? (
                filteredOrders.map((order) => {
                  const badge = getOrderStatusBadge(order.status);
                  return (
                    <Link
                      key={order.id}
                      href={`/orders/${order.id}`}
                      className="block bg-white rounded-3xl border border-slate-200/80 p-4 shadow-stitch hover:border-sky-300 transition group"
                    >
                      {/* Card Header: Order Number, Date & Status */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">
                              {order.order_number}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(order.created_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      </div>

                      {/* Items Summary */}
                      <div className="py-3 space-y-2">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-xs text-slate-700"
                          >
                            <div className="flex items-center gap-2 truncate pr-2">
                              <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="font-medium truncate">
                                {item.product_name_snapshot}
                              </span>
                              <span className="text-slate-400 text-[11px]">
                                ({item.quantity} × {item.variant_name_snapshot})
                              </span>
                            </div>
                            <span className="font-bold shrink-0">
                              {formatRupiah(item.subtotal)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Card Footer: Total & CTA */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-slate-400">Total Belanja</div>
                          <div className="text-sm font-extrabold text-sky-700">
                            {formatRupiah(order.total)}
                          </div>
                        </div>

                        <div className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 group-hover:text-sky-700">
                          <span>Lihat Detail & Lacak</span>
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-xs font-bold text-slate-800">Belum Ada Pesanan</h4>
                  <p className="text-[11px] text-slate-500 mt-1 mb-4">
                    Anda belum memiliki transaksi pesanan pada filter ini.
                  </p>
                  <Link
                    href="/products"
                    className="inline-block px-4 py-2 rounded-xl bg-sky-600 text-white font-bold text-xs"
                  >
                    Beli Obat Sekarang
                  </Link>
                </div>
              )}
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <OrdersContent />
    </Suspense>
  );
}
