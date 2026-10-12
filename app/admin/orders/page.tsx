'use client';

import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  Search,
  Eye,
  CheckCircle2,
  Clock,
  Bike,
  Package,
  XCircle,
  AlertCircle,
  Loader2,
  X,
  CreditCard,
  MapPin,
  User,
  Phone,
  FileText,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { Order, OrderStatus } from '@/lib/types';
import { formatRupiah, getOrderStatusBadge, getPaymentStatusBadge } from '@/lib/utils';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Konfirmasi Perubahan Status
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    order: Order | null;
    targetStatus: OrderStatus | null;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    order: null,
    targetStatus: null,
    isSubmitting: false,
  });

  // Modal Detail Pesanan
  const [selectedDetailOrder, setSelectedDetailOrder] = useState<Order | null>(null);

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

  const getCustomerInfo = (ord: Order) => {
    const addr = ord.delivery_address && typeof ord.delivery_address === 'object' ? ord.delivery_address : null;
    const name = ord.customer_name?.trim() || addr?.recipient_name?.trim() || 'Pelanggan Apotek';
    const phone = ord.customer_phone?.trim() || addr?.phone?.trim() || '';
    return { name, phone };
  };

  const handleOpenConfirmModal = (order: Order, targetStatus: OrderStatus) => {
    setConfirmModal({
      isOpen: true,
      order,
      targetStatus,
      isSubmitting: false,
    });
  };

  const handleExecuteStatusUpdate = async () => {
    if (!confirmModal.order || !confirmModal.targetStatus) return;

    const orderId = confirmModal.order.id;
    const newStatus = confirmModal.targetStatus;
    const willBePaid = newStatus === 'confirmed';

    setConfirmModal((prev) => ({ ...prev, isSubmitting: true }));

    // Optimistic UI update
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          return {
            ...ord,
            status: newStatus,
            payment_status: willBePaid && ord.payment_status === 'waiting_confirmation' ? 'paid' : ord.payment_status,
          };
        }
        return ord;
      })
    );

    // If detail modal is open for this order, update it too
    if (selectedDetailOrder && selectedDetailOrder.id === orderId) {
      setSelectedDetailOrder((prev) =>
        prev
          ? {
              ...prev,
              status: newStatus,
              payment_status: willBePaid && prev.payment_status === 'waiting_confirmation' ? 'paid' : prev.payment_status,
            }
          : null
      );
    }

    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          paymentStatus: willBePaid ? 'paid' : undefined,
        }),
      });
    } catch (err) {
      console.error('Failed to update status on server:', err);
    } finally {
      setConfirmModal({
        isOpen: false,
        order: null,
        targetStatus: null,
        isSubmitting: false,
      });
    }
  };

  const filteredOrders = orders.filter((o) => {
    const matchStatus = activeFilter === 'all' || o.status === activeFilter;
    const customer = getCustomerInfo(o);
    const query = searchQuery.toLowerCase().trim();
    const matchQuery =
      !query ||
      o.order_number.toLowerCase().includes(query) ||
      customer.name.toLowerCase().includes(query) ||
      customer.phone.toLowerCase().includes(query);
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
            Kelola alur konfirmasi pembayaran QRIS/Transfer, peracikan obat, dan pengantaran kurir
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Cari nomor pesanan, nama customer, atau nomor telepon..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs transition"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'Semua Status' },
          { id: 'pending', label: 'Menunggu Konfirmasi' },
          { id: 'prescription_review', label: 'Review Resep' },
          { id: 'confirmed', label: 'Dikonfirmasi' },
          { id: 'preparing', label: 'Disiapkan Apotek' },
          { id: 'out_for_delivery', label: 'Sedang Diantar' },
          { id: 'completed', label: 'Selesai' },
          { id: 'cancelled', label: 'Dibatalkan' },
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
            const paymentBadge = getPaymentStatusBadge(ord.payment_status);
            const nextStatuses = statusTransitions[ord.status] || [];
            const customer = getCustomerInfo(ord);

            return (
              <div
                key={ord.id}
                className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-stitch space-y-4 transition"
              >
                {/* Order Head */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center font-bold text-xs shrink-0">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-900 font-mono">
                          {ord.order_number}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${paymentBadge.color}`}
                        >
                          Bayar: {paymentBadge.label} ({ord.payment_method?.toUpperCase()})
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Customer: <strong className="text-slate-900">{customer.name}</strong>
                        {customer.phone && customer.phone !== '-' ? (
                          <span className="text-slate-500 ml-1">({customer.phone})</span>
                        ) : null}
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <div className="text-[10px] text-slate-400">Total Pembayaran</div>
                    <div className="text-base font-extrabold text-sky-700">
                      {formatRupiah(ord.total)}
                    </div>
                  </div>
                </div>

                {/* Items Snapshot Breakdown */}
                <div className="bg-slate-50/70 rounded-2xl p-3 border border-slate-100 space-y-2 text-xs">
                  {ord.items?.map((item) => (
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
                    <span>{ord.delivery_address?.address_line}</span>
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

                {/* Action Buttons: Status Transition with Confirmation Modal & Lihat Detail Button */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {nextStatuses.map((ns) => {
                      const nextBadge = getOrderStatusBadge(ns);
                      const isCancel = ns === 'cancelled';
                      return (
                        <button
                          key={ns}
                          type="button"
                          onClick={() => handleOpenConfirmModal(ord, ns)}
                          className={`px-3.5 py-2 rounded-xl font-bold text-xs transition active:scale-95 flex items-center gap-1.5 shadow-xs ${
                            isCancel
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                              : 'bg-sky-600 hover:bg-sky-700 text-white'
                          }`}
                        >
                          {isCancel ? (
                            <XCircle className="w-3.5 h-3.5" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>Ubah ke: {nextBadge.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Tombol Lihat Detail (menggantikan tombol lihat halaman customer) */}
                  <button
                    type="button"
                    onClick={() => setSelectedDetailOrder(ord)}
                    className="text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 hover:text-sky-800 px-3.5 py-2 rounded-xl border border-sky-200/80 transition flex items-center gap-1.5 shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Lihat Detail</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL KONFIRMASI UBAH STATUS */}
      {confirmModal.isOpen && confirmModal.order && confirmModal.targetStatus && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-slate-900">
                <AlertCircle className="w-5 h-5 text-sky-600" />
                <h3 className="font-extrabold text-sm">Konfirmasi Perubahan Status</h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmModal({ isOpen: false, order: null, targetStatus: null, isSubmitting: false })}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-2xl space-y-1.5 border border-slate-100">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nomor Pesanan:</span>
                  <span className="font-mono font-bold text-slate-900">{confirmModal.order.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold text-slate-900">{getCustomerInfo(confirmModal.order).name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Metode Bayar:</span>
                  <span className="font-bold text-slate-900 uppercase">{confirmModal.order.payment_method}</span>
                </div>
              </div>

              {/* Status Change Arrow */}
              <div className="flex items-center justify-between p-3 bg-sky-50/60 rounded-2xl border border-sky-100">
                <div>
                  <div className="text-[10px] text-slate-400 mb-0.5">Status Saat Ini</div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getOrderStatusBadge(confirmModal.order.status).color}`}>
                    {getOrderStatusBadge(confirmModal.order.status).label}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-sky-600 shrink-0" />
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 mb-0.5">Status Baru</div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getOrderStatusBadge(confirmModal.targetStatus).color}`}>
                    {getOrderStatusBadge(confirmModal.targetStatus).label}
                  </span>
                </div>
              </div>

              {/* Notice Description */}
              {confirmModal.targetStatus === 'confirmed' && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] leading-relaxed">
                  <strong>Pengecekan Admin:</strong> Anda akan mengonfirmasi pesanan ini. Pembayaran customer via{' '}
                  <strong className="uppercase">{confirmModal.order.payment_method}</strong> akan diverifikasi dan status pembayaran akan otomatis menjadi <strong>Lunas</strong>.
                </div>
              )}

              {confirmModal.targetStatus === 'cancelled' && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-[11px] leading-relaxed">
                  <strong>Peringatan:</strong> Pesanan ini akan dibatalkan. Pastikan Anda telah mengonfirmasi alasan pembatalan ini ke pelanggan apotek.
                </div>
              )}

              {confirmModal.targetStatus === 'preparing' && (
                <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 text-sky-900 text-[11px] leading-relaxed">
                  Pesanan akan dialihkan ke staf apotek untuk penyiapan dan peracikan obat sesuai standar farmasi.
                </div>
              )}

              {confirmModal.targetStatus === 'out_for_delivery' && (
                <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-[11px] leading-relaxed">
                  Pesanan telah selesai disiapkan dan diserahkan ke kurir apotek untuk diantar ke alamat customer.
                </div>
              )}

              {confirmModal.targetStatus === 'completed' && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] leading-relaxed">
                  Pesanan akan ditandai sebagai Selesai. Pastikan obat telah diterima dengan baik oleh customer.
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                disabled={confirmModal.isSubmitting}
                onClick={() => setConfirmModal({ isOpen: false, order: null, targetStatus: null, isSubmitting: false })}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={confirmModal.isSubmitting}
                onClick={handleExecuteStatusUpdate}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white transition flex items-center gap-1.5 shadow-sm"
              >
                {confirmModal.isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>Ya, Ubah Status</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LIHAT DETAIL PESANAN */}
      {selectedDetailOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-slate-900">
                    Detail Pesanan #{selectedDetailOrder.order_number}
                  </h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      getOrderStatusBadge(selectedDetailOrder.status).color
                    }`}
                  >
                    {getOrderStatusBadge(selectedDetailOrder.status).label}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Dibuat pada: {new Date(selectedDetailOrder.created_at).toLocaleString('id-ID')}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDetailOrder(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Grid: Customer & Delivery */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Customer Box */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-sky-600" />
                  <span>Data Pelanggan</span>
                </div>
                <div className="space-y-1 text-slate-600">
                  <p>
                    Nama: <strong className="text-slate-900">{getCustomerInfo(selectedDetailOrder).name}</strong>
                  </p>
                  <p>
                    No. Telepon / WA:{' '}
                    <strong className="text-slate-900">{getCustomerInfo(selectedDetailOrder).phone || '-'}</strong>
                  </p>
                  {selectedDetailOrder.customer_note && (
                    <p className="text-[11px] italic text-slate-500 pt-1 border-t border-slate-200">
                      Catatan: &ldquo;{selectedDetailOrder.customer_note}&rdquo;
                    </p>
                  )}
                </div>
              </div>

              {/* Delivery Box */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-sky-600" />
                  <span>Alamat & Pengiriman</span>
                </div>
                <div className="space-y-1 text-slate-600">
                  <p>
                    Layanan: <strong className="text-slate-900 uppercase">{selectedDetailOrder.delivery_option}</strong>
                  </p>
                  <p className="leading-relaxed">
                    Alamat: <span className="text-slate-800">{selectedDetailOrder.delivery_address?.address_line}</span>
                  </p>
                  {selectedDetailOrder.delivery_address?.notes && (
                    <p className="text-[11px] text-slate-500">
                      Patokan: {selectedDetailOrder.delivery_address.notes}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Payment Summary Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3 text-xs">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600" />
                  <span>Status & Metode Pembayaran</span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    getPaymentStatusBadge(selectedDetailOrder.payment_status).color
                  }`}
                >
                  {getPaymentStatusBadge(selectedDetailOrder.payment_status).label}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-slate-200/60">
                <div>
                  <span className="text-slate-400 text-[10px]">Metode</span>
                  <div className="font-bold text-slate-900 uppercase">
                    {selectedDetailOrder.payment_method === 'bank_transfer'
                      ? 'Transfer Bank'
                      : selectedDetailOrder.payment_method}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Subtotal Produk</span>
                  <div className="font-semibold text-slate-800">{formatRupiah(selectedDetailOrder.subtotal)}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Ongkos Kirim</span>
                  <div className="font-semibold text-slate-800">{formatRupiah(selectedDetailOrder.delivery_fee)}</div>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px]">Total Pesanan</span>
                  <div className="font-extrabold text-sky-700">{formatRupiah(selectedDetailOrder.total)}</div>
                </div>
              </div>

              {selectedDetailOrder.payment_status === 'waiting_confirmation' && (
                <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 text-[11px] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Pembayaran ini <strong>sedang menunggu konfirmasi admin</strong>. Klik tombol &ldquo;Ubah ke: Dikonfirmasi&rdquo; di bawah jika dana transfer / QRIS telah diterima di rekening apotek.
                  </span>
                </div>
              )}
            </div>

            {/* Prescription Warning if applicable */}
            {selectedDetailOrder.requires_prescription && (
              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 space-y-2 text-xs">
                <div className="font-bold text-purple-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span>Pesanan Mengandung Obat Resep Dokter</span>
                </div>
                <p className="text-purple-800 text-[11px]">
                  Pesanan ini mewajibkan resep dokter asli. Verifikasi resep dapat dilakukan melalui menu manajemen resep apoteker.
                </p>
              </div>
            )}

            {/* Items Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-sky-600" />
                <span>Rincian Obat / Produk ({selectedDetailOrder.items?.length || 0} item)</span>
              </h4>

              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Nama Produk</th>
                      <th className="py-2.5 px-3">Kemasan</th>
                      <th className="py-2.5 px-3 text-center">Jumlah</th>
                      <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedDetailOrder.items?.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          {item.product_name_snapshot}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {item.variant_name_snapshot} ({item.quantity_per_package_snapshot} {item.unit_snapshot})
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          {formatRupiah(item.price_snapshot)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-slate-900">
                          {formatRupiah(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                {(statusTransitions[selectedDetailOrder.status] || []).map((ns) => {
                  const nextBadge = getOrderStatusBadge(ns);
                  const isCancel = ns === 'cancelled';
                  return (
                    <button
                      key={ns}
                      type="button"
                      onClick={() => handleOpenConfirmModal(selectedDetailOrder, ns)}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs transition flex items-center gap-1.5 ${
                        isCancel
                          ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                          : 'bg-sky-600 hover:bg-sky-700 text-white shadow-xs'
                      }`}
                    >
                      {isCancel ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      <span>Ubah ke: {nextBadge.label}</span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setSelectedDetailOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
