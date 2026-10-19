'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  DollarSign,
  FileCheck2,
  MessageSquare,
  TrendingUp,
  Package,
  AlertTriangle,
  ArrowRight,
  Clock,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/lib/store/auth-context';
import { Order, Product, StoreSettings } from '@/lib/types';
import { formatRupiah, getOrderStatusBadge } from '@/lib/utils';

export default function AdminDashboardPage() {
  const { user, role } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/orders?role=admin', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/products', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/store', { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([ordersJson, productsJson, storeJson]) => {
        if (ordersJson.success && ordersJson.data) setOrders(ordersJson.data);
        if (productsJson.success && productsJson.data) setProducts(productsJson.data);
        if (storeJson.success && storeJson.data) setStoreSettings(storeJson.data);
      })
      .catch((err) => console.error('Dashboard data fetch error:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const pendingPrescriptionsCount = orders.filter(
    (o) => o.status !== 'cancelled' && o.requires_prescription && o.prescription_status === 'pending'
  ).length;

  const todayRevenue = orders
    .filter((o) => o.status !== 'cancelled' && o.payment_status === 'paid')
    .reduce((sum, o) => sum + Number(o.total || 0), 0);

  const stats = [
    {
      title: 'Total Pesanan Masuk',
      value: `${orders.length} Pesanan`,
      subtitle: 'Data pesanan terupdate',
      icon: ShoppingBag,
      color: 'bg-sky-500 text-white',
      trend: '+15%',
    },
    {
      title: 'Total Omzet Transaksi',
      value: formatRupiah(todayRevenue),
      subtitle: 'Akumulasi transaksi berhasil',
      icon: DollarSign,
      color: 'bg-emerald-500 text-white',
      trend: '+22%',
    },
    {
      title: 'Verifikasi Resep Dokter',
      value: `${pendingPrescriptionsCount} Perlu Respon`,
      subtitle: 'Memerlukan review Apoteker PJ',
      icon: FileCheck2,
      color: 'bg-rose-500 text-white',
      highlight: true,
      href: '/admin/prescriptions',
    },
    {
      title: 'Katalog Obat Aktif',
      value: `${products.length} Produk`,
      subtitle: 'Tersedia di etalase apotek',
      icon: Package,
      color: 'bg-indigo-500 text-white',
      href: '/admin/products',
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Welcome Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-stitch flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-600">
            {storeSettings?.store_name || 'Apotek Jabat'}
          </span>
          <h2 className="text-lg font-extrabold text-slate-900 mt-0.5">
            Selamat Bertugas, {user?.full_name || storeSettings?.pharmacist_name || 'Staf Farmasi'} 👋
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Status Operasional:{' '}
            <span className="text-emerald-700 font-bold">● Buka Operasional ({storeSettings?.opening_time || '08:00'} – {storeSettings?.closing_time || '21:00'} WIB)</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/products/new"
            className="px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition active:scale-95 flex items-center gap-1.5"
          >
            <Package className="w-4 h-4" />
            <span>+ Tambah Obat Baru</span>
          </Link>
          <Link
            href="/admin/prescriptions"
            className="px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition flex items-center gap-1.5"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Review Resep ({pendingPrescriptionsCount})</span>
          </Link>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          const CardContent = (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-stitch flex flex-col justify-between h-full hover:border-sky-300 transition">
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold text-slate-500">
                  {stat.title}
                </span>
                <div
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center ${stat.color} shadow-sm`}
                >
                  <Icon className="w-4.5 h-4.5" />
                </div>
              </div>

              <div className="mt-3">
                <div className="text-xl font-extrabold text-slate-900 leading-tight">
                  {stat.value}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  {stat.trend && (
                    <span className="text-emerald-600 font-bold flex items-center">
                      <TrendingUp className="w-3 h-3 inline mr-0.5" />
                      {stat.trend}
                    </span>
                  )}
                  <span>{stat.subtitle}</span>
                </div>
              </div>
            </div>
          );

          if (stat.href) {
            return (
              <Link key={idx} href={stat.href} className="block">
                {CardContent}
              </Link>
            );
          }
          return <div key={idx}>{CardContent}</div>;
        })}
      </div>

      {/* Main Grid: Recent Orders & Stock Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders (2 columns) */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-5 shadow-stitch space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Pesanan Masuk Terbaru
              </h3>
              <p className="text-xs text-slate-500">
                Pantau pesanan yang perlu segera disiapkan dan dikirim kurir
              </p>
            </div>
            <Link
              href="/admin/orders"
              className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
              <span className="text-xs font-medium">Memuat data pesanan...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              Belum ada pesanan masuk.
            </div>
          ) : (
            <div className="space-y-3">
              {orders.slice(0, 5).map((ord) => {
                const badge = getOrderStatusBadge(ord.status);
                return (
                  <div
                    key={ord.id}
                    className="p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 font-mono">
                          {ord.order_number}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700">
                        <strong>{ord.customer_name}</strong> • {ord.items?.length || 0} item obat
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Metode: {ord.payment_method?.toUpperCase()} • {ord.delivery_address?.address_line}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:flex-col sm:items-end gap-1">
                      <span className="text-sm font-extrabold text-sky-700">
                        {formatRupiah(ord.total)}
                      </span>
                      <Link
                        href="/admin/orders"
                        className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-sky-700 hover:bg-sky-50 text-xs font-bold transition"
                      >
                        Proses Pesanan
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Stock & Quick Actions (1 column) */}
        <div className="space-y-4">
          {/* Pharmacist Duty Card */}
          <div className="bg-sky-50/80 rounded-3xl border border-sky-200 p-4 space-y-3">
            <div className="flex items-center gap-2 text-sky-900">
              <FileCheck2 className="w-5 h-5 text-sky-700" />
              <h4 className="text-xs font-bold">Standard Operasional Apotek</h4>
            </div>
            <ul className="text-xs text-slate-700 space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Verifikasi keaslian resep dan dosis sebelum menyerahkan obat keras.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Gunakan pouch bersegel anti-rusak untuk pengiriman kurir.</span>
              </li>
            </ul>
          </div>

          {/* Popular Products Mini List */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-stitch space-y-3">
            <h4 className="text-xs font-bold text-slate-900 pb-1 border-b border-slate-100">
              Stok Obat Populer
            </h4>
            <div className="space-y-2.5">
              {products.slice(0, 4).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <div className="truncate pr-2">
                    <span className="font-bold text-slate-900 block truncate">
                      {p.name}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {p.variants[0]?.stock || 0} unit tersisa
                    </span>
                  </div>
                  <span className="font-extrabold text-sky-700 shrink-0">
                    {formatRupiah(p.variants[0]?.price || 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
