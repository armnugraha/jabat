'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Bike,
  Package,
  MapPin,
  CreditCard,
  FileText,
  AlertTriangle,
  MessageSquare,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { mockStoreSettings } from '@/lib/data/mock-data';
import { formatRupiah, getOrderStatusBadge } from '@/lib/utils';
import { Order, OrderStatus } from '@/lib/types';
import { useAuth } from '@/lib/store/auth-context';
import { AuthRequiredCard } from '@/components/customer/AuthRequiredCard';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    fetch(`/api/orders/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setOrder(json.data);
        }
      })
      .catch((err) => console.error('Error fetching order detail:', err))
      .finally(() => setIsLoading(false));
  }, [id]);

  const badge = order ? getOrderStatusBadge(order.status) : { label: 'Memuat...', color: 'bg-slate-100 text-slate-700' };

  // Define steps for the visual timeline
  const normalSteps: { status: OrderStatus; label: string; desc: string }[] = [
    {
      status: 'pending',
      label: 'Pesanan Dibuat',
      desc: 'Pesanan diterima sistem apotek',
    },
    {
      status: 'confirmed',
      label: 'Dikonfirmasi',
      desc: 'Pembayaran valid & disetujui staf',
    },
    {
      status: 'preparing',
      label: 'Disiapkan Apotek',
      desc: 'Obat dicek & dikemas higienis',
    },
    {
      status: 'out_for_delivery',
      label: 'Sedang Diantar',
      desc: 'Kurir apotek dalam perjalanan ke lokasi',
    },
    {
      status: 'completed',
      label: 'Pesanan Selesai',
      desc: 'Obat telah diterima dengan baik',
    },
  ];

  const prescriptionSteps: { status: OrderStatus; label: string; desc: string }[] = [
    {
      status: 'pending',
      label: 'Pesanan Dibuat',
      desc: 'Pesanan resep dibuat customer',
    },
    {
      status: 'prescription_review',
      label: 'Verifikasi Resep',
      desc: `Ditinjau oleh ${mockStoreSettings.pharmacist_name}`,
    },
    {
      status: 'confirmed',
      label: 'Dikonfirmasi',
      desc: 'Resep valid & disetujui apoteker',
    },
    {
      status: 'preparing',
      label: 'Disiapkan Apotek',
      desc: 'Peracikan obat & penempelan etiket dosis',
    },
    {
      status: 'out_for_delivery',
      label: 'Sedang Diantar',
      desc: 'Kurir apotek meluncur dengan thermo-pouch',
    },
    {
      status: 'completed',
      label: 'Selesai',
      desc: 'Obat telah diterima dengan baik',
    },
  ];

  const timelineSteps = order?.requires_prescription ? prescriptionSteps : normalSteps;

  const getStepIndex = (status?: OrderStatus) => {
    if (!status) return 0;
    return timelineSteps.findIndex((s) => s.status === status);
  };

  const currentStepIndex = getStepIndex(order?.status);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-12">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 py-3 shadow-xs">
        <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-1.5 rounded-xl text-slate-700 hover:bg-slate-100 transition border border-slate-200 bg-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm md:text-base font-bold text-slate-900 leading-tight">
                Lacak Pesanan
              </h1>
              <p className="text-[10px] md:text-xs text-slate-500 font-mono">
                {order?.order_number || 'ASM-DETAIL'}
              </p>
            </div>
          </div>

          <Link
            href="/chat"
            className="p-2 px-3 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 transition flex items-center gap-1.5 text-xs font-bold border border-sky-100"
          >
            <MessageSquare className="w-4 h-4 text-sky-600" />
            <span>Tanya Apoteker</span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 md:px-8 space-y-4 pt-4">
        {!user ? (
          <AuthRequiredCard
            icon={FileText}
            title="Masuk untuk Melacak Pesanan"
            description="Informasi rincian obat, resep dokter, dan posisi kurir hanya dapat diakses oleh pemilik akun."
            badge="Pelacakan Pesanan"
          />
        ) : isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400 bg-white rounded-3xl border border-slate-200/80">
            <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
            <span className="text-xs font-medium">Memuat data pesanan...</span>
          </div>
        ) : !order ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-slate-800">Pesanan Tidak Ditemukan</h4>
            <p className="text-[11px] text-slate-500 mt-1 mb-4">
              Data pesanan tidak ditemukan di sistem apotek.
            </p>
            <Link
              href="/orders"
              className="inline-block px-4 py-2 rounded-xl bg-sky-600 text-white font-bold text-xs"
            >
              Kembali ke Daftar Pesanan
            </Link>
          </div>
        ) : (
          <>
            {/* Status Header Banner */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-stitch space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">Status Saat Ini:</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold border ${badge.color}`}
                >
                  {badge.label}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                  <Bike className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {order.delivery_option === 'express'
                      ? 'Kurir Express Apotek Tebet'
                      : 'Reguler'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Estimasi tiba: 30–45 Menit (Suhu Terjaga)
                  </p>
                </div>
              </div>
            </div>

            {/* Visual Step-by-Step Timeline */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-stitch space-y-4">
              <h3 className="text-xs font-bold text-slate-900 pb-2 border-b border-slate-100">
                Perjalanan Pesanan
              </h3>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                {timelineSteps.map((step, idx) => {
                  const isPast = idx <= currentStepIndex;
                  const isCurrent = idx === currentStepIndex;

                  return (
                    <div key={step.status} className="relative">
                      {/* Step Dot */}
                      <div
                        className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isPast
                            ? 'bg-sky-600 border-sky-600 text-white'
                            : 'bg-white border-slate-300 text-transparent'
                        }`}
                      >
                        {isPast && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>

                      <div>
                        <h4
                          className={`text-xs font-bold ${
                            isCurrent
                              ? 'text-sky-700'
                              : isPast
                              ? 'text-slate-900'
                              : 'text-slate-400'
                          }`}
                        >
                          {step.label}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Prescription Verification Card if applicable */}
            {order.requires_prescription && (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-stitch space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-sky-600" />
                    <h3 className="text-xs font-bold text-slate-900">
                      Resep Dokter Terlampir
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                    {order.prescription_status === 'approved'
                      ? '✓ Disetujui'
                      : 'Sedang Diverifikasi'}
                  </span>
                </div>

                {order.prescription_file_url && (
                  <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 p-2">
                    <img
                      src={order.prescription_file_url}
                      alt="Resep Dokter"
                      className="w-full h-36 object-cover rounded-xl"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Order Items Snapshots */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-stitch space-y-3">
              <h3 className="text-xs font-bold text-slate-900 pb-2 border-b border-slate-100">
                Rincian Item Obat ({order.items.length} item)
              </h3>

              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between text-xs">
                    <div>
                      <h4 className="font-bold text-slate-900">
                        {item.product_name_snapshot}
                      </h4>
                      <div className="text-[11px] text-slate-500">
                        {item.quantity} × {item.variant_name_snapshot} ({item.quantity_per_package_snapshot} {item.unit_snapshot})
                      </div>
                    </div>
                    <div className="font-extrabold text-slate-900">
                      {formatRupiah(item.subtotal)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal Produk</span>
                  <span>{formatRupiah(order.subtotal)}</span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span>Diskon</span>
                  <span>-{formatRupiah(order.discount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Biaya Pengiriman</span>
                  <span>{formatRupiah(order.delivery_fee)}</span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between font-extrabold text-slate-900 text-sm">
                  <span>Total Pembayaran</span>
                  <span className="text-sky-700">{formatRupiah(order.total)}</span>
                </div>
              </div>
            </div>

            {/* Delivery Address Details */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-stitch space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-600" />
                <h3 className="text-xs font-bold text-slate-900">
                  Alamat Pengantaran
                </h3>
              </div>
              <div className="text-xs text-slate-700 space-y-0.5">
                <div className="font-bold">
                  {order.delivery_address.recipient_name} ({order.delivery_address.phone})
                </div>
                <p className="text-slate-600 leading-relaxed">
                  {order.delivery_address.address_line}
                </p>
                {order.customer_note && (
                  <p className="text-[11px] text-slate-500 italic pt-1">
                    Catatan: &ldquo;{order.customer_note}&rdquo;
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
