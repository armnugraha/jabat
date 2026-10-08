'use client';

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, Package, ShoppingBag, Loader2 } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { Order, Product } from '@/lib/types';

export default function AdminReportsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/orders?role=admin').then((r) => r.json()),
      fetch('/api/products').then((r) => r.json()),
    ])
      .then(([ordersJson, productsJson]) => {
        if (ordersJson.success && ordersJson.data) setOrders(ordersJson.data);
        if (productsJson.success && productsJson.data) setProducts(productsJson.data);
      })
      .catch((err) => console.error('Failed to load report data:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const totalRevenue = orders
    .filter((o) => o.payment_status === 'paid')
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

  const completedOrders = orders.filter((o) => o.status === 'completed' || o.payment_status === 'paid');
  const avgOrderValue = completedOrders.length > 0 ? Math.round(totalRevenue / completedOrders.length) : 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <div>
        <h2 className="text-lg font-extrabold text-slate-900">
          Laporan Penjualan Farmasi
        </h2>
        <p className="text-xs text-slate-500">
          Ringkasan omset penjualan obat, resep terverifikasi, dan produk terlaris dari database
        </p>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400 bg-white rounded-3xl border border-slate-200/80">
          <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
          <span className="text-xs">Menghitung laporan penjualan dari Supabase...</span>
        </div>
      ) : (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-stitch">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-2">
                <span>Total Omzet Penjualan</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900">
                {formatRupiah(totalRevenue)}
              </div>
              <span className="text-xs text-emerald-600 font-bold mt-1 inline-block">
                {orders.length} total pesanan tercatat
              </span>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-stitch">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-2">
                <span>Total Transaksi Selesai/Dibayar</span>
                <ShoppingBag className="w-4 h-4 text-sky-600" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900">
                {completedOrders.length} Pesanan
              </div>
              <span className="text-xs text-slate-500 font-medium mt-1 inline-block">
                Transaksi terverifikasi
              </span>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-stitch">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-2">
                <span>Rata-Rata Belanja (AOV)</span>
                <TrendingUp className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900">
                {formatRupiah(avgOrderValue)}
              </div>
              <span className="text-xs text-indigo-600 font-bold mt-1 inline-block">
                Per transaksi pelanggan
              </span>
            </div>
          </div>

          {/* Best Selling Medicines */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-stitch space-y-4">
            <h3 className="text-xs font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Package className="w-4 h-4 text-sky-600" />
              <span>Katalog Obat & Produk Apotek</span>
            </h3>

            {products.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Belum ada data produk di database.
              </div>
            ) : (
              <div className="space-y-3">
                {products.slice(0, 6).map((p, idx) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-800 font-extrabold flex items-center justify-center text-xs">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-900">{p.name}</h4>
                        <p className="text-[10px] text-slate-500">
                          {p.requires_prescription ? 'Wajib Resep Dokter' : 'Obat Bebas'} • {p.manufacturer || 'Kimia Farma'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-slate-800 block">
                        Stok: {p.variants?.[0]?.stock || 0} unit
                      </span>
                      <span className="text-[11px] font-extrabold text-sky-700">
                        {formatRupiah(p.variants?.[0]?.price || 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
