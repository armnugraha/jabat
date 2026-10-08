'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  User,
  Phone,
  ShieldCheck,
  Building,
  Clock,
  MessageSquare,
  Loader2,
} from 'lucide-react';
import { Order, PrescriptionStatus, StoreSettings } from '@/lib/types';
import { formatRupiah } from '@/lib/utils';

export default function AdminPrescriptionsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [pharmacistNote, setPharmacistNote] = useState('');
  const [reviewAction, setReviewAction] = useState<'approve' | 'revision' | 'reject' | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const fetchPrescriptions = () => {
    setIsLoading(true);
    Promise.all([
      fetch('/api/orders?role=admin').then((r) => r.json()),
      fetch('/api/store').then((r) => r.json()),
    ])
      .then(([ordersJson, storeJson]) => {
        if (ordersJson.success && ordersJson.data) {
          const rxOrders = ordersJson.data.filter((o: Order) => o.requires_prescription);
          setOrders(rxOrders);
          if (rxOrders.length > 0) {
            setSelectedOrder(rxOrders[0]);
          }
        }
        if (storeJson.success && storeJson.data) {
          setStoreSettings(storeJson.data);
        }
      })
      .catch((err) => console.error('Failed to fetch prescription queue:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const handleUpdatePrescription = async (newStatus: PrescriptionStatus) => {
    if (!selectedOrder) return;

    const newOrderStatus = newStatus === 'approved' ? 'confirmed' : selectedOrder.status;

    setOrders((prev) =>
      prev.map((ord) =>
        ord.id === selectedOrder.id
          ? {
              ...ord,
              prescription_status: newStatus,
              status: newOrderStatus,
            }
          : ord
      )
    );

    setSelectedOrder((prev) =>
      prev ? { ...prev, prescription_status: newStatus, status: newOrderStatus } : null
    );

    try {
      await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prescription_status: newStatus,
          status: newOrderStatus,
          pharmacist_notes: pharmacistNote,
        }),
      });
    } catch (err) {
      console.error('Failed to update prescription status on server:', err);
    }

    const actionText =
      newStatus === 'approved'
        ? 'Resep dokter berhasil DISETUJUI. Pesanan telah dikonfirmasi.'
        : newStatus === 'needs_revision'
        ? 'Permintaan revisi resep telah dikirimkan ke pelanggan.'
        : 'Resep dokter DITOLAK.';

    setToastMessage(actionText);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
    setReviewAction(null);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Toast Notification */}
      {showSuccessToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Kewenangan Apoteker PJ ({storeSettings?.pharmacist_sipa || 'SIPA Resmi'})</span>
          </div>
          <h2 className="text-lg font-extrabold text-slate-900">
            Meja Verifikasi Resep Dokter
          </h2>
          <p className="text-xs text-slate-500">
            Tinjau keabsahan resep digital sebelum pesanan obat keras disiapkan oleh apotek
          </p>
        </div>
      </div>

      {/* Main Grid: Prescription Queue & Detail Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Prescription Queue List */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-stitch space-y-3">
          <h3 className="text-xs font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between">
            <span>Antrean Resep Masuk</span>
            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold">
              {orders.length} Resep
            </span>
          </h3>

          {isLoading ? (
            <div className="py-10 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-sky-600" />
              <span className="text-xs">Memuat antrean resep...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Tidak ada antrean resep dokter saat ini.
            </div>
          ) : (
            <div className="space-y-2">
              {orders.map((ord) => {
                const isSelected = selectedOrder?.id === ord.id;
                return (
                  <button
                    key={ord.id}
                    onClick={() => setSelectedOrder(ord)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all ${
                      isSelected
                        ? 'border-sky-600 bg-sky-50/50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-bold text-slate-900 font-mono">
                        {ord.order_number}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          ord.prescription_status === 'approved'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {ord.prescription_status === 'approved'
                          ? 'Disetujui'
                          : 'Menunggu Review'}
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 font-semibold">
                      {ord.customer_name}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {ord.items?.map((i) => i.product_name_snapshot).join(', ') || 'Obat Resep'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Selected Prescription Review Desk (2 columns) */}
        {selectedOrder ? (
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-5 shadow-stitch space-y-5">
            {/* Header info */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 font-mono">
                  ID PESANAN: {selectedOrder.order_number}
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  {selectedOrder.customer_name} ({selectedOrder.customer_phone})
                </h3>
              </div>

              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Status: {selectedOrder.prescription_status?.toUpperCase()}
              </span>
            </div>

            {/* Prescription Image Preview */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Dokumen Foto Resep Dokter:
              </label>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 overflow-hidden max-h-80 flex items-center justify-center">
                <img
                  src={
                    selectedOrder.prescription_file_url ||
                    'https://images.unsplash.com/photo-1583912267670-6575ad4736f8?w=800&auto=format&fit=crop&q=80'
                  }
                  alt="Foto Resep Dokter"
                  className="max-h-72 w-auto object-contain rounded-xl"
                />
              </div>
            </div>

            {/* Required Prescription Medicines in this order */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Daftar Obat Keras yang Ditebus:
              </label>
              <div className="space-y-2">
                {selectedOrder.items?.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-900">
                        {item.product_name_snapshot}
                      </span>
                      <div className="text-[11px] text-slate-500">
                        Jumlah: {item.quantity} × {item.variant_name_snapshot}
                      </div>
                    </div>
                    <span className="font-extrabold text-sky-700">
                      {formatRupiah(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pharmacist Action Desk */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <label className="block text-xs font-bold text-slate-900">
                Catatan Verifikasi Apoteker PJ (Wajib diisi jika revisi/tolak):
              </label>
              <textarea
                rows={2}
                value={pharmacistNote}
                onChange={(e) => setPharmacistNote(e.target.value)}
                placeholder="Contoh: Resep valid, sediaan amoxicillin sesuai dosis..."
                className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleUpdatePrescription('approved')}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Setujui Resep</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdatePrescription('needs_revision')}
                  className="py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>Minta Resep Baru</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdatePrescription('rejected')}
                  className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Tolak Resep</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-8 text-center flex flex-col items-center justify-center">
            <FileCheck2 className="w-12 h-12 text-slate-300 mb-2" />
            <p className="text-xs text-slate-500">
              Pilih salah satu pesanan di sebelah kiri untuk melihat resep.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
