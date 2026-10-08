'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ShieldCheck,
  CheckSquare,
  Square,
  Trash2,
  Heart,
  Plus,
  Minus,
  MapPin,
  Bike,
  Sparkles,
  Tag,
  CreditCard,
  QrCode,
  Banknote,
  FileUp,
  X,
  AlertTriangle,
  ChevronRight,
  Info,
  Building,
} from 'lucide-react';
import { useCart } from '@/lib/store/cart-context';
import { useAuth } from '@/lib/store/auth-context';
import { formatRupiah } from '@/lib/utils';
import { mockCustomerAddress } from '@/lib/data/mock-data';
import { DeliveryOption, PaymentMethod, Promotion } from '@/lib/types';

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [availablePromotions, setAvailablePromotions] = useState<Promotion[]>([]);

  useEffect(() => {
    fetch('/api/promotions')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setAvailablePromotions(json.data);
        }
      })
      .catch((err) => console.error('Failed to load promotions:', err));
  }, []);
  const {
    items,
    updateQuantity,
    removeItem,
    toggleItemSelection,
    toggleSelectAll,
    allSelected,
    itemCount,
    selectedCount,
    subtotal,
    productDiscountTotal,
    appliedPromo,
    applyPromo,
    removePromo,
    promoDiscount,
    deliveryOption,
    setDeliveryOption,
    deliveryFee,
    paymentMethod,
    setPaymentMethod,
    customerNotes,
    setCustomerNotes,
    prescriptionFile,
    prescriptionPreviewUrl,
    setPrescriptionFile,
    hasPrescriptionItems,
    total,
    clearCart,
  } = useCart();

  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [prescriptionNotes, setPrescriptionNotes] = useState('');

  const handleApplyPromo = () => {
    setPromoError('');
    const result = applyPromo(promoInput);
    if (!result.success) {
      setPromoError(result.message);
    } else {
      setIsPromoModalOpen(false);
      setPromoInput('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPrescriptionFile(e.target.files[0]);
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      alert('Silakan masuk (login) ke akun Anda terlebih dahulu sebelum melakukan checkout pesanan.');
      router.push('/account');
      return;
    }

    if (selectedCount === 0) {
      alert('Pilih minimal 1 produk untuk checkout');
      return;
    }

    if (hasPrescriptionItems && !prescriptionFile) {
      alert('Pesanan ini mengandung obat keras yang memerlukan unggah foto resep dokter.');
      return;
    }

    setIsPlacingOrder(true);
    try {
      const selectedList = items.filter((it) => it.selected);
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: user.id,
          customerName: user.full_name,
          customerPhone: user.phone,
          items: selectedList,
          subtotal,
          discount: productDiscountTotal + promoDiscount,
          deliveryFee,
          total,
          deliveryOption,
          deliveryAddress: mockCustomerAddress,
          paymentMethod,
          customerNotes,
          requiresPrescription: hasPrescriptionItems,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        clearCart();
        router.push(`/orders?placed=true&id=${json.data.id}`);
      } else {
        alert(json.error || 'Gagal memproses pesanan.');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Terjadi kesalahan jaringan saat membuat pesanan.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-32">
      {/* Top Header (Stitch Screen 4) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 py-3 shadow-xs">
        <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-1.5 rounded-xl text-slate-700 hover:bg-slate-100 transition border border-slate-200 bg-white"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm md:text-base font-bold text-slate-900 leading-tight">
                Keranjang Belanja ({itemCount} item)
              </h1>
            </div>
          </div>

          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs md:text-sm font-bold text-sky-600 hover:text-sky-700 px-3 py-1.5 rounded-xl hover:bg-sky-50 transition"
            >
              Kosongkan
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto w-full px-4 sm:px-6 md:px-8 space-y-4 pt-4">
        {items.length > 0 ? (
          <>
            {/* Select All Row */}
            <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200/80 p-3 shadow-stitch text-xs">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 font-bold text-slate-800"
              >
                {allSelected ? (
                  <CheckSquare className="w-4 h-4 text-sky-600 fill-sky-100" />
                ) : (
                  <Square className="w-4 h-4 text-slate-300" />
                )}
                <span>Pilih Semua ({items.length})</span>
              </button>

              <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>Apotek Jabat - Tebet</span>
              </div>
            </div>

            {/* Safety & Hygiene Guarantee Banner */}
            <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-3 flex items-start gap-2.5 text-xs text-sky-950">
              <ShieldCheck className="w-4.5 h-4.5 text-sky-600 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Semua obat dikemas higienis dengan segel anti-rusak farmasi dan pouch suhu terjaga oleh apoteker resmi kami.
              </p>
            </div>

            {/* Cart Item Cards */}
            <div className="space-y-3">
              {items.map((item) => {
                const isPrescription = item.product.requires_prescription;
                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-3xl border p-3.5 shadow-stitch transition-all ${
                      item.selected ? 'border-slate-200' : 'border-slate-200/50 opacity-70'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Item Checkbox */}
                      <button
                        onClick={() => toggleItemSelection(item.id)}
                        className="mt-1"
                      >
                        {item.selected ? (
                          <CheckSquare className="w-4 h-4 text-sky-600 fill-sky-100" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300" />
                        )}
                      </button>

                      {/* Thumbnail Image */}
                      <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-100 p-1 shrink-0 overflow-hidden">
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          className="w-full h-full object-contain mix-blend-multiply"
                        />
                      </div>

                      {/* Item Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              isPrescription
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            • {isPrescription ? 'Wajib Resep' : 'Obat Bebas'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium truncate">
                            • {item.product.manufacturer || 'Kimia Farma'}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                          {item.product.name}
                        </h4>
                        <p className="text-[10px] text-slate-500 line-clamp-1">
                          Kemasan: {item.variant.name} ({item.variant.quantity_per_package} {item.variant.unit})
                        </p>

                        <div className="flex items-baseline gap-1.5 mt-1">
                          <span className="text-xs font-extrabold text-sky-700">
                            {formatRupiah(item.variant.price)}
                          </span>
                          {item.variant.strike_price && (
                            <span className="text-[10px] text-slate-400 line-through">
                              {formatRupiah(item.variant.strike_price)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Bar (Save & Quantity Controls) */}
                    <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-[11px] text-slate-400 hover:text-rose-500 font-medium flex items-center gap-1 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>

                      <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-5 h-5 flex items-center justify-center rounded bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-5 h-5 flex items-center justify-center rounded bg-white text-slate-700 hover:bg-slate-100 text-xs font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Prescription Upload Section (Shown if any selected item is Wajib Resep) */}
            {hasPrescriptionItems && (
              <div className="bg-rose-50/70 rounded-3xl border border-rose-200 p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-rose-900">
                      Pesanan Memerlukan Verifikasi Resep Dokter
                    </h3>
                    <p className="text-[11px] text-rose-700 mt-0.5">
                      Terdapat obat keras dalam keranjang Anda. Sesuai regulasi BPOM & Kemenkes RI, mohon lampirkan foto resep resmi.
                    </p>
                  </div>
                </div>

                {prescriptionPreviewUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-rose-300 bg-white p-2">
                    <img
                      src={prescriptionPreviewUrl}
                      alt="Resep Dokter"
                      className="w-full h-36 object-cover rounded-xl"
                    />
                    <button
                      onClick={() => setPrescriptionFile(null)}
                      className="absolute top-3 right-3 p-1.5 bg-black/70 text-white rounded-full hover:bg-black"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="text-[11px] text-slate-700 font-bold mt-2 px-1 flex items-center justify-between">
                      <span>{prescriptionFile?.name || 'resep-dokter.jpg'}</span>
                      <span className="text-emerald-600">✓ Siap Diverifikasi</span>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-rose-300 hover:border-rose-400 bg-white rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer text-center transition">
                    <FileUp className="w-6 h-6 text-rose-500 mb-1" />
                    <span className="text-xs font-bold text-rose-800">
                      Upload Foto Resep Dokter
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5">
                      Format JPG, PNG, atau PDF (Maks. 5MB)
                    </span>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}

                <input
                  type="text"
                  value={prescriptionNotes}
                  onChange={(e) => setPrescriptionNotes(e.target.value)}
                  placeholder="Catatan resep (misal: nama dokter / klinik asal)..."
                  className="w-full bg-white border border-rose-200 rounded-xl py-2 px-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
                />
              </div>
            )}

            {/* Alamat Pengiriman Section (Stitch Screen 4) */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-stitch space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-sky-600" />
                  <h3 className="text-xs font-bold text-slate-900">
                    Alamat Pengiriman
                  </h3>
                </div>
                <button className="text-[11px] font-bold text-sky-600 hover:text-sky-700">
                  Ubah Alamat
                </button>
              </div>

              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/70 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    Rumah – {user?.full_name || mockCustomerAddress.recipient_name}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md bg-sky-600 text-white text-[9px] font-bold">
                    Utama
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  ({user?.phone || mockCustomerAddress.phone})
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {mockCustomerAddress.address_line}, {mockCustomerAddress.subdistrict}, {mockCustomerAddress.city} {mockCustomerAddress.postal_code}
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  <span>💬 Catatan untuk Apoteker / Kurir</span>
                </label>
                <input
                  type="text"
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder="Contoh: Mohon sertakan plastik klip kedap udara..."
                  className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Opsi Pengiriman Obat (Stitch Screen 4) */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-stitch space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bike className="w-4 h-4 text-sky-600" />
                  <h3 className="text-xs font-bold text-slate-900">
                    Opsi Pengiriman Obat
                  </h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold">
                  Suhu Terjaga
                </span>
              </div>

              <div className="space-y-2">
                {/* Option 1: Express Apotek (Recommended) */}
                <button
                  onClick={() => setDeliveryOption('express')}
                  className={`w-full text-left p-3 rounded-2xl border transition-all flex items-start justify-between ${
                    deliveryOption === 'express'
                      ? 'border-sky-600 bg-sky-50/40 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                        deliveryOption === 'express'
                          ? 'border-sky-600 bg-sky-600 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {deliveryOption === 'express' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">
                          Kurir Express Apotek Tebet
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-sky-600 text-white text-[8px] font-extrabold uppercase">
                          Rekomendasi
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Estimasi 30–45 Menit • Dikirim langsung dengan cold/safety pouch apotek
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-900 shrink-0">
                    Rp 10.000
                  </span>
                </button>

                {/* Option 2: Reguler Sameday */}
                <button
                  onClick={() => setDeliveryOption('regular')}
                  className={`w-full text-left p-3 rounded-2xl border transition-all flex items-start justify-between ${
                    deliveryOption === 'regular'
                      ? 'border-sky-600 bg-sky-50/40 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                        deliveryOption === 'regular'
                          ? 'border-sky-600 bg-sky-600 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {deliveryOption === 'regular' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900">
                        Reguler (Sameday / GoSend)
                      </span>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Estimasi 2–4 Jam kedatangan
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-900 shrink-0">
                    Rp 15.000
                  </span>
                </button>

                {/* Option 3: Ambil Sendiri */}
                <button
                  onClick={() => setDeliveryOption('pickup')}
                  className={`w-full text-left p-3 rounded-2xl border transition-all flex items-start justify-between ${
                    deliveryOption === 'pickup'
                      ? 'border-sky-600 bg-sky-50/40 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                        deliveryOption === 'pickup'
                          ? 'border-sky-600 bg-sky-600 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {deliveryOption === 'pickup' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900">
                        Ambil Sendiri di Apotek
                      </span>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Siap diambil dalam 15 menit di counter farmasi
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 shrink-0">
                    Gratis
                  </span>
                </button>
              </div>
            </div>

            {/* Voucher & Promo Farmasi Section (Stitch Screen 4) */}
            <button
              onClick={() => setIsPromoModalOpen(true)}
              className="w-full bg-white rounded-3xl border border-slate-200/80 p-4 shadow-stitch flex items-center justify-between text-left hover:border-sky-300 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
                  <Tag className="w-4.5 h-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      Voucher & Promo Farmasi
                    </span>
                    {appliedPromo && (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold">
                        1 Digunakan
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-sky-700 font-semibold mt-0.5">
                    {appliedPromo
                      ? `${appliedPromo.code} • Potongan ${formatRupiah(appliedPromo.discount_value)}`
                      : 'Gunakan voucher hemat'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* Metode Pembayaran (Stitch Screen 4) */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-stitch space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-sky-600" />
                  <h3 className="text-xs font-bold text-slate-900">
                    Metode Pembayaran
                  </h3>
                </div>
                <span className="text-[11px] font-bold text-sky-600">Pilih</span>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => setPaymentMethod('qris')}
                  className={`w-full p-3 rounded-2xl border flex items-center justify-between transition ${
                    paymentMethod === 'qris'
                      ? 'border-sky-600 bg-sky-50/40'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-extrabold text-[10px] text-sky-800">
                      QRIS
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold text-slate-900">
                        QRIS / GoPay / OVO
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Konfirmasi Instan Bebas Biaya Layanan
                      </div>
                    </div>
                  </div>
                  <ShieldCheck
                    className={`w-4 h-4 ${
                      paymentMethod === 'qris' ? 'text-sky-600' : 'text-slate-300'
                    }`}
                  />
                </button>

                <button
                  onClick={() => setPaymentMethod('bank_transfer')}
                  className={`w-full p-3 rounded-2xl border flex items-center justify-between transition ${
                    paymentMethod === 'bank_transfer'
                      ? 'border-sky-600 bg-sky-50/40'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[10px] text-slate-700">
                      BCA
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold text-slate-900">
                        Transfer Bank Manual
                      </div>
                      <div className="text-[10px] text-slate-500">
                        BCA 8830-1928-4411 (Apotek Sehat Mandiri)
                      </div>
                    </div>
                  </div>
                  <ShieldCheck
                    className={`w-4 h-4 ${
                      paymentMethod === 'bank_transfer' ? 'text-sky-600' : 'text-slate-300'
                    }`}
                  />
                </button>

                <button
                  onClick={() => setPaymentMethod('cod')}
                  className={`w-full p-3 rounded-2xl border flex items-center justify-between transition ${
                    paymentMethod === 'cod'
                      ? 'border-sky-600 bg-sky-50/40'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-7 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[10px] text-slate-700">
                      COD
                    </div>
                    <div className="text-left">
                      <div className="text-xs font-bold text-slate-900">
                        Bayar di Tempat (COD)
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Bayar tunai saat kurir apotek tiba di rumah
                      </div>
                    </div>
                  </div>
                  <ShieldCheck
                    className={`w-4 h-4 ${
                      paymentMethod === 'cod' ? 'text-sky-600' : 'text-slate-300'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Rincian Pembayaran Breakdown (Stitch Screen 4) */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-stitch space-y-2.5">
              <h3 className="text-xs font-bold text-slate-900 pb-1 border-b border-slate-100">
                Rincian Pembayaran
              </h3>

              <div className="flex justify-between text-xs text-slate-600">
                <span>Total Harga Produk ({selectedCount} item)</span>
                <span className="font-semibold text-slate-900">
                  {formatRupiah(subtotal + productDiscountTotal)}
                </span>
              </div>

              {productDiscountTotal > 0 && (
                <div className="flex justify-between text-xs text-emerald-600 font-medium">
                  <span>Total Diskon Produk</span>
                  <span>-{formatRupiah(productDiscountTotal)}</span>
                </div>
              )}

              <div className="flex justify-between text-xs text-slate-600">
                <span>
                  Ongkos Kirim ({deliveryOption === 'express' ? 'Kurir Apotek Express' : deliveryOption === 'regular' ? 'Reguler' : 'Ambil Sendiri'})
                </span>
                <span className="font-semibold text-slate-900">
                  {deliveryFee === 0 ? 'Gratis' : formatRupiah(deliveryFee)}
                </span>
              </div>

              {promoDiscount > 0 && (
                <div className="flex justify-between text-xs text-emerald-600 font-medium">
                  <span>Diskon Promo ({appliedPromo?.code})</span>
                  <span>-{formatRupiah(promoDiscount)}</span>
                </div>
              )}

              <div className="flex justify-between text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  Biaya Layanan & Segel Pengaman
                  <Info className="w-3 h-3 text-slate-400" />
                </span>
                <span className="font-semibold text-emerald-600">
                  <span className="text-slate-400 line-through text-[10px] mr-1">
                    Rp 2.000
                  </span>
                  Gratis
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-sm font-extrabold text-slate-900">
                <span>Total Pembayaran</span>
                <span className="text-base text-sky-700">{formatRupiah(total)}</span>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center my-6 shadow-stitch">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
              <Building className="w-8 h-8" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">Keranjang Masih Kosong</h4>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Yuk jelajahi berbagai obat dan kebutuhan kesehatan resmi farmasi kami.
            </p>
            <Link
              href="/products"
              className="inline-block px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition"
            >
              Belanja Sekarang
            </Link>
          </div>
        )}
      </main>

      {/* Sticky Bottom Checkout Bar (Only shown when cart has items) */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 p-3.5 shadow-2xl">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button onClick={toggleSelectAll} className="p-0.5">
                {allSelected ? (
                  <CheckSquare className="w-4 h-4 text-sky-600 fill-sky-100" />
                ) : (
                  <Square className="w-4 h-4 text-slate-300" />
                )}
              </button>
              <div>
                <div className="text-[10px] text-slate-400 font-medium">
                  Total:{' '}
                  <span className="text-xs font-extrabold text-sky-700">
                    {formatRupiah(total)}
                  </span>
                </div>
                <div className="text-[10px] text-emerald-600 font-semibold">
                  Hemat {formatRupiah(productDiscountTotal + promoDiscount)}
                </div>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={isPlacingOrder || selectedCount === 0}
              className="flex-1 max-w-[180px] py-3.5 px-4 rounded-2xl bg-sky-600 hover:bg-sky-700 active:scale-95 disabled:bg-slate-300 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-600/25 transition"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isPlacingOrder ? 'Memproses...' : 'Bayar Sekarang'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Promo Modal */}
      {isPromoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Gunakan Voucher Promo
              </h3>
              <button
                onClick={() => setIsPromoModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder="Ketik kode promo (misal: HEMATSEHAT)..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs uppercase font-bold focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <button
                  onClick={handleApplyPromo}
                  className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Terapkan
                </button>
              </div>
              {promoError && (
                <p className="text-[10px] text-rose-600 font-semibold">{promoError}</p>
              )}
            </div>

            {/* Available Vouchers */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-700">
                Voucher Tersedia:
              </span>
              {availablePromotions.length === 0 ? (
                <p className="text-xs text-slate-400 py-2 text-center">
                  Tidak ada voucher yang dapat digunakan saat ini.
                </p>
              ) : (
                availablePromotions.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-2xl border border-dashed border-sky-300 bg-sky-50/50 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-extrabold text-sky-800 font-mono">
                        {p.code}
                      </span>
                      <p className="text-[10px] text-slate-600 mt-0.5">{p.description}</p>
                    </div>
                    <button
                      onClick={() => {
                        applyPromo(p.code);
                        setIsPromoModalOpen(false);
                      }}
                      className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white text-[10px] font-bold rounded-lg"
                    >
                      Pakai
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
