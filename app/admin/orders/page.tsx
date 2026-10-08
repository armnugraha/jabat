'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShoppingBag,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Clock,
  Bike,
  Package,
  XCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Order, OrderStatus } from '@/lib/types';
import { formatRupiah, getOrderStatusBadge } from '@/lib/utils';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchOrders = () => {
    setIsLoading(true);
    fetch('/api/orders?role=admin')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setOrders(json.data);
        }
      })
      .catch((err) => console.error('Error fetching admin orders:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const statusTransitions: Record<OrderStatus, OrderStatus[]> = {
    pending: ['confirmed', 'cancelled'],
    waiting_prescription: ['prescription_review', 'cancelled'],
    prescription_review: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['out_for_delivery'],
    out_for_delivery: ['completed'],
    completed: [],
    cancelled: [],
  };

  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, status: newStatus } : ord))
    );

    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error('Failed to update status on server:', err);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchStatus = activeFilter === 'all' || o.status === activeFilter;
    const matchQuery =
      o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.customer_name &&
        o.customer_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchStatus && matchQuery;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">
            Manajemen Pesanan Apotek
          </h2>
          <p className="text-xs text-slate-500">
            Kelola alur konfirmasi pembayaran, peracikan obat, dan pengantaran kurir
          </p>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'Semua Status' },
          { id: 'pending', label: 'Menunggu' },
          { id: 'prescription_review', label: 'Review Resep' },
          { id: 'confirmed', label: 'Dikonfirmasi' },
          { id: 'preparing', label: 'Disiapkan Apotek' },
          { id: 'out_for_delivery', label: 'Sedang Diantar' },
          { id: 'completed', label: 'Selesai' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
              activeFilter === tab.id
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders Table / Cards */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400 bg-white rounded-3xl border border-slate-200/80">
            <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
            <span className="text-xs font-medium">Memuat data pesanan masuk dari server...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center">
            <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-slate-800">Tidak Ada Pesanan</h4>
            <p className="text-[11px] text-slate-500 mt-1">
              Belum ada pesanan masuk pada filter ini.
            </p>
          </div>
        ) : (
          filteredOrders.map((ord) => {
            const badge = getOrderStatusBadge(ord.status);
            const nextStatuses = statusTransitions[ord.status] || [];

            return (
              <div
                key={ord.id}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-stitch space-y-4"
              >
              {/* Order Head */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-xs">
                    <ShoppingBag className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-slate-900 font-mono">
                        {ord.order_number}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Customer: <strong>{ord.customer_name}</strong> ({ord.customer_phone})
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-400">Total Pembayaran</div>
                  <div className="text-base font-extrabold text-sky-700">
                    {formatRupiah(ord.total)}
                  </div>
                </div>
              </div>

              {/* Items Snapshot Breakdown */}
              <div className="bg-slate-50/70 rounded-2xl p-3 border border-slate-100 space-y-2 text-xs">
                {ord.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between text-slate-700"
                  >
                    <div>
                      <span className="font-bold text-slate-900">
                        {item.product_name_snapshot}
                      </span>
                      <span className="text-slate-400 ml-1.5">
                        ({item.quantity} × {item.variant_name_snapshot} @ {item.quantity_per_package_snapshot} {item.unit_snapshot})
                      </span>
                    </div>
                    <span className="font-semibold">{formatRupiah(item.subtotal)}</span>
                  </div>
                ))}
              </div>

              {/* Address and Delivery Note */}
              <div className="text-xs text-slate-600 flex flex-col sm:flex-row justify-between gap-2">
                <div>
                  <span className="text-slate-400 font-semibold">Alamat Kirim: </span>
                  <span>{ord.delivery_address.address_line}</span>
                  {ord.customer_note && (
                    <div className="text-[11px] text-slate-500 italic mt-0.5">
                      Catatan: &ldquo;{ord.customer_note}&rdquo;
                    </div>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 font-medium shrink-0">
                  Pengiriman: <strong className="text-slate-800 uppercase">{ord.delivery_option}</strong> • Pembayaran: <strong className="text-slate-800 uppercase">{ord.payment_method}</strong>
                </div>
              </div>

              {/* Action Buttons for Valid Transitions */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {nextStatuses.map((ns) => {
                    const nextBadge = getOrderStatusBadge(ns);
                    return (
                      <button
                        key={ns}
                        onClick={() => handleUpdateStatus(ord.id, ns)}
                        className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition active:scale-95 flex items-center gap-1.5 shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Ubah ke: {nextBadge.label}</span>
                      </button>
                    );
                  })}
                </div>

                <Link
                  href={`/orders/${ord.id}`}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-xl border border-slate-200"
                >
                  Lihat Halaman Customer
                </Link>
              </div>
            </div>
          );
        }))}
      </div>
    </div>
  );
}
