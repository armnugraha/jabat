'use client';

import React, { useState, useEffect } from 'react';
import {
  Store,
  Save,
  Clock,
  Bike,
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  QrCode,
  UploadCloud,
  X,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { StoreSettings } from '@/lib/types';
import { formatRupiah } from '@/lib/utils';

export default function AdminStoreSettingsPage() {
  const [settings, setSettings] = useState<StoreSettings>({
    id: 'store-1',
    store_name: 'Apotek Jabat',
    tagline: 'Farmasi Digital Resmi & Terpercaya',
    branch_name: 'Tebet Barat, Jakarta Selatan',
    address: 'Jl. Tebet Barat Dalam Raya No. 42, RT.05/RW.02, Tebet Barat, Jakarta Selatan, DKI Jakarta 12810',
    phone: '0812-3456-7890',
    whatsapp: '6281234567890',
    email: 'layanan@jabat.id',
    pharmacist_name: 'apt. Siti Rahma, S.Farm.',
    pharmacist_sipa: '19870412/SIPA-31.74/2021/2048',
    is_open: true,
    opening_time: '08:00',
    closing_time: '21:00',
    express_delivery_fee: 10000,
    regular_delivery_fee: 15000,
    free_delivery_threshold: 100000,
    bank_transfer_enabled: true,
    bank_name: 'Bank Central Asia (BCA)',
    bank_account_number: '8830-1928-4411',
    bank_account_holder: 'Apotek Jabat',
    qris_enabled: true,
    qris_image_url: '',
    cod_enabled: true,
    min_order_amount: 10000,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingQris, setIsUploadingQris] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetch('/api/store', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setSettings(json.data);
        }
      })
      .catch((err) => console.error('Failed to load store settings:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleQrisImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    setIsUploadingQris(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (json.success && json.url) {
        setSettings((prev) => ({ ...prev, qris_image_url: json.url }));
      } else {
        alert(json.error || 'Gagal mengunggah foto QRIS');
      }
    } catch (err) {
      console.error('QRIS upload error:', err);
      alert('Terjadi kesalahan saat mengunggah foto QRIS.');
    } finally {
      setIsUploadingQris(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (json.success) {
        if (json.data) {
          setSettings(json.data);
        }
        setSaved(true);
        setTimeout(() => setSaved(false), 3500);
      } else {
        setErrorMessage(json.error || 'Gagal menyimpan pengaturan ke Supabase.');
      }
    } catch (err: any) {
      console.error('Failed to save store settings:', err);
      setErrorMessage(err?.message || 'Gagal menghubungkan ke server.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-2 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
        <span className="text-xs font-semibold">Memuat pengaturan apotek...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Toast Feedback */}
      {saved && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Pengaturan apotek berhasil disimpan & diperbarui!</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">
            Pengaturan Apotek & Layanan Farmasi
          </h2>
          <p className="text-xs text-slate-500">
            Konfigurasi jam operasional, SIPA Apoteker, QRIS pembayaran, kurir pengiriman, dan rekening bank
          </p>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
        </button>
      </div>

      {/* Identitas Apotek & Apoteker */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-stitch space-y-4">
        <h3 className="text-xs font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-sky-600" />
          <span>1. Identitas Resmi Farmasi & SIPA</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nama Apotek *
            </label>
            <input
              type="text"
              required
              value={settings.store_name}
              onChange={(e) =>
                setSettings({ ...settings, store_name: e.target.value })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Tagline / Slogan
            </label>
            <input
              type="text"
              value={settings.tagline || ''}
              onChange={(e) =>
                setSettings({ ...settings, tagline: e.target.value })
              }
              placeholder="Farmasi Digital Resmi & Terpercaya"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nama Cabang / Wilayah
            </label>
            <input
              type="text"
              value={settings.branch_name || ''}
              onChange={(e) =>
                setSettings({ ...settings, branch_name: e.target.value })
              }
              placeholder="Tebet Barat, Jakarta Selatan"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nama Apoteker Penanggung Jawab *
            </label>
            <input
              type="text"
              required
              value={settings.pharmacist_name}
              onChange={(e) =>
                setSettings({ ...settings, pharmacist_name: e.target.value })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nomor Surat Izin Praktik Apoteker (SIPA) *
            </label>
            <input
              type="text"
              required
              value={settings.pharmacist_sipa}
              onChange={(e) =>
                setSettings({ ...settings, pharmacist_sipa: e.target.value })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nomor WhatsApp / Telepon Apotek
            </label>
            <input
              type="text"
              value={settings.phone}
              onChange={(e) =>
                setSettings({ ...settings, phone: e.target.value, whatsapp: e.target.value.replace(/[^0-9]/g, '') })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 font-mono focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block font-bold text-slate-700 mb-1">
              Alamat Lengkap Apotek *
            </label>
            <input
              type="text"
              required
              value={settings.address}
              onChange={(e) =>
                setSettings({ ...settings, address: e.target.value })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Pengaturan Jam Operasional & Biaya Pengiriman */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-stitch space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
              <Bike className="w-4 h-4 text-sky-600 shrink-0" />
              <span>2. Status Buka, Jam Operasional & Ongkir Kurir</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Atur status buka-tutup toko, jam layanan operasional, dan tarif ongkos kirim kurir.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={settings.is_open}
              onClick={() => setSettings({ ...settings, is_open: !settings.is_open })}
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${
                settings.is_open ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
              title="Klik untuk mengubah status buka/tutup apotek"
            >
              <span className="sr-only">Toggle status buka apotek</span>
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  settings.is_open ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
            <span
              onClick={() => setSettings({ ...settings, is_open: !settings.is_open })}
              className={`cursor-pointer select-none text-xs font-bold px-2.5 py-1 rounded-xl transition border ${
                settings.is_open
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              }`}
            >
              {settings.is_open ? '✓ Apotek Buka' : '✕ Apotek Tutup'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Jam Buka
            </label>
            <input
              type="time"
              value={settings.opening_time}
              onChange={(e) =>
                setSettings({ ...settings, opening_time: e.target.value })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Jam Tutup
            </label>
            <input
              type="time"
              value={settings.closing_time}
              onChange={(e) =>
                setSettings({ ...settings, closing_time: e.target.value })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 font-semibold focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Minimal Belanja (Rp)
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              placeholder="0"
              value={settings.min_order_amount === 0 ? '' : settings.min_order_amount}
              onChange={(e) => {
                const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
                setSettings({ ...settings, min_order_amount: val });
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 font-extrabold text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Ongkir Kurir Express (Rp)
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              placeholder="0"
              value={settings.express_delivery_fee === 0 ? '' : settings.express_delivery_fee}
              onChange={(e) => {
                const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
                setSettings({ ...settings, express_delivery_fee: val });
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 font-extrabold text-sky-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Ongkir Reguler Sameday (Rp)
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              placeholder="0"
              value={settings.regular_delivery_fee === 0 ? '' : settings.regular_delivery_fee}
              onChange={(e) => {
                const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
                setSettings({ ...settings, regular_delivery_fee: val });
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 font-extrabold text-sky-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Ambang Gratis Ongkir (Rp)
            </label>
            <input
              type="number"
              min="0"
              step="5000"
              placeholder="0"
              value={settings.free_delivery_threshold === 0 ? '' : settings.free_delivery_threshold}
              onChange={(e) => {
                const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
                setSettings({ ...settings, free_delivery_threshold: val });
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 font-extrabold text-emerald-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Pengaturan QRIS Pembayaran */}
      <div className={`bg-white rounded-3xl border ${settings.qris_enabled ? 'border-slate-200/80 shadow-stitch' : 'border-slate-200/60 bg-slate-50/30'} p-5 space-y-4 transition`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
              <QrCode className="w-4 h-4 text-sky-600 shrink-0" />
              <span>3. Pengaturan & Foto Barcode QRIS</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Aktifkan metode ini jika ingin menerima pembayaran scan QRIS (GoPay, OVO, Dana, BCA QRIS, dll).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={settings.qris_enabled}
              onClick={() => setSettings({ ...settings, qris_enabled: !settings.qris_enabled })}
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${
                settings.qris_enabled ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
              title="Klik untuk mengaktifkan / menonaktifkan metode QRIS"
            >
              <span className="sr-only">Toggle QRIS</span>
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  settings.qris_enabled ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
            <span
              onClick={() => setSettings({ ...settings, qris_enabled: !settings.qris_enabled })}
              className={`cursor-pointer select-none text-xs font-bold px-2.5 py-1 rounded-xl transition border ${
                settings.qris_enabled
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
              }`}
            >
              {settings.qris_enabled ? '✓ QRIS Aktif' : '✕ QRIS Nonaktif'}
            </span>
          </div>
        </div>

        {!settings.qris_enabled && (
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-amber-50 border border-amber-200/80 rounded-2xl text-amber-800 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Metode QRIS saat ini <strong>Nonaktif</strong>. Opsi scan QRIS tidak akan ditampilkan kepada pasien saat checkout di keranjang.
            </span>
          </div>
        )}

        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs items-start transition ${!settings.qris_enabled ? 'opacity-60' : ''}`}>
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Upload Gambar Barcode QRIS
            </label>
            <p className="text-[11px] text-slate-500 mb-2">
              Unggah gambar barcode QRIS resmi apotek (Gopay/OVO/ShopeePay/BCA QRIS). Gambar akan ditampilkan saat pasien memilih bayar via QRIS.
            </p>

            <label className="border-2 border-dashed border-sky-300 hover:border-sky-400 bg-sky-50/40 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer text-center transition">
              {isUploadingQris ? (
                <div className="py-2 flex flex-col items-center gap-1 text-sky-600">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-xs font-bold">Mengunggah gambar...</span>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-6 h-6 text-sky-600 mb-1" />
                  <span className="text-xs font-bold text-sky-800">
                    Pilih Foto QRIS
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    Format JPG, PNG, atau WEBP
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleQrisImageUpload}
                disabled={isUploadingQris}
                className="hidden"
              />
            </label>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Preview Barcode QRIS
            </label>
            {settings.qris_image_url ? (
              <div className="relative border border-slate-200 rounded-2xl p-2 bg-slate-50 max-w-[220px]">
                <img
                  src={settings.qris_image_url}
                  alt="QRIS Barcode"
                  className="w-full h-44 object-contain rounded-xl bg-white border border-slate-100"
                />
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, qris_image_url: '' })}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-rose-600 text-white hover:bg-rose-700 shadow-md"
                  title="Hapus gambar QRIS"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="h-44 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 text-xs p-4 text-center">
                <QrCode className="w-8 h-8 text-slate-300 mb-1" />
                <span>Belum ada foto QRIS yang diunggah</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pengaturan Pembayaran Bank Transfer */}
      <div className={`bg-white rounded-3xl border ${settings.bank_transfer_enabled ? 'border-slate-200/80 shadow-stitch' : 'border-slate-200/60 bg-slate-50/30'} p-5 space-y-4 transition`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>4. Rekening Pembayaran Transfer Bank Manual (Bisa Banyak / Multiple)</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Daftar nomor rekening bank tujuan transfer (BCA, Mandiri, BRI, BNI, dll). Pasien dapat memilih saat checkout.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={settings.bank_transfer_enabled}
              onClick={() => setSettings({ ...settings, bank_transfer_enabled: !settings.bank_transfer_enabled })}
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${
                settings.bank_transfer_enabled ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
              title="Klik untuk mengaktifkan / menonaktifkan metode Transfer Bank"
            >
              <span className="sr-only">Toggle Transfer Bank</span>
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  settings.bank_transfer_enabled ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
            <span
              onClick={() => setSettings({ ...settings, bank_transfer_enabled: !settings.bank_transfer_enabled })}
              className={`cursor-pointer select-none text-xs font-bold px-2.5 py-1 rounded-xl transition border ${
                settings.bank_transfer_enabled
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
              }`}
            >
              {settings.bank_transfer_enabled ? '✓ Transfer Aktif' : '✕ Transfer Nonaktif'}
            </span>
          </div>
        </div>

        {!settings.bank_transfer_enabled && (
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-amber-50 border border-amber-200/80 rounded-2xl text-amber-800 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Metode Transfer Bank saat ini <strong>Nonaktif</strong>. Pilihan transfer rekening bank tidak akan ditampilkan kepada pasien saat checkout di keranjang.
            </span>
          </div>
        )}

        {/* List of Bank Accounts */}
        <div className={`space-y-3 transition ${!settings.bank_transfer_enabled ? 'opacity-60' : ''}`}>
          {(settings.bank_accounts && settings.bank_accounts.length > 0 ? settings.bank_accounts : [
            {
              id: 'acc-1',
              bank_name: settings.bank_name || 'Bank Central Asia (BCA)',
              account_number: settings.bank_account_number || '8830-1928-4411',
              account_holder: settings.bank_account_holder || settings.store_name || 'Apotek Jabat',
            }
          ]).map((acc, index) => (
            <div
              key={acc.id || index}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Rekening #{index + 1}
                </span>
                {(settings.bank_accounts?.length || 1) > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const updated = (settings.bank_accounts || []).filter((_, i) => i !== index);
                      setSettings({ ...settings, bank_accounts: updated });
                    }}
                    className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition text-xs font-semibold flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-600 mb-1">
                    Nama Bank
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Bank Central Asia (BCA)"
                    value={acc.bank_name}
                    onChange={(e) => {
                      const current = settings.bank_accounts && settings.bank_accounts.length > 0
                        ? [...settings.bank_accounts]
                        : [{ id: 'acc-1', bank_name: settings.bank_name, account_number: settings.bank_account_number, account_holder: settings.bank_account_holder }];
                      current[index] = { ...current[index], bank_name: e.target.value };
                      setSettings({
                        ...settings,
                        bank_accounts: current,
                        bank_name: current[0]?.bank_name || '',
                      });
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">
                    Nomor Rekening
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 8830-1928-4411"
                    value={acc.account_number}
                    onChange={(e) => {
                      const current = settings.bank_accounts && settings.bank_accounts.length > 0
                        ? [...settings.bank_accounts]
                        : [{ id: 'acc-1', bank_name: settings.bank_name, account_number: settings.bank_account_number, account_holder: settings.bank_account_holder }];
                      current[index] = { ...current[index], account_number: e.target.value };
                      setSettings({
                        ...settings,
                        bank_accounts: current,
                        bank_account_number: current[0]?.account_number || '',
                      });
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-600 mb-1">
                    Atas Nama (Holder)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Apotek Sehat Mandiri"
                    value={acc.account_holder}
                    onChange={(e) => {
                      const current = settings.bank_accounts && settings.bank_accounts.length > 0
                        ? [...settings.bank_accounts]
                        : [{ id: 'acc-1', bank_name: settings.bank_name, account_number: settings.bank_account_number, account_holder: settings.bank_account_holder }];
                      current[index] = { ...current[index], account_holder: e.target.value };
                      setSettings({
                        ...settings,
                        bank_accounts: current,
                        bank_account_holder: current[0]?.account_holder || '',
                      });
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() => {
              const current = settings.bank_accounts && settings.bank_accounts.length > 0
                ? [...settings.bank_accounts]
                : [{ id: 'acc-1', bank_name: settings.bank_name || 'BCA', account_number: settings.bank_account_number || '', account_holder: settings.bank_account_holder || settings.store_name }];
              const newAcc = {
                id: `acc-${Date.now()}`,
                bank_name: '',
                account_number: '',
                account_holder: settings.store_name || 'Apotek Jabat',
              };
              setSettings({ ...settings, bank_accounts: [...current, newAcc] });
            }}
            className="w-full py-2.5 px-3 rounded-2xl border-2 border-dashed border-emerald-300 hover:border-emerald-400 bg-emerald-50/40 text-emerald-700 font-bold text-xs flex items-center justify-center gap-1.5 transition"
          >
            <span>+ Tambah Rekening Bank Lainnya</span>
          </button>
        </div>
      </div>

      {/* Pengaturan Pembayaran COD */}
      <div className={`bg-white rounded-3xl border ${settings.cod_enabled ? 'border-slate-200/80 shadow-stitch' : 'border-slate-200/60 bg-slate-50/30'} p-5 space-y-3 transition`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
              <Bike className="w-4 h-4 text-orange-600 shrink-0" />
              <span>5. Pembayaran Tunai di Tempat (COD)</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Jika diaktifkan, pasien dapat memilih metode pembayaran bayar tunai langsung saat kurir apotek mengantarkan pesanan obat ke alamat.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={settings.cod_enabled}
              onClick={() => setSettings({ ...settings, cod_enabled: !settings.cod_enabled })}
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 ${
                settings.cod_enabled ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
              title="Klik untuk mengaktifkan / menonaktifkan metode COD"
            >
              <span className="sr-only">Toggle COD</span>
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  settings.cod_enabled ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
            <span
              onClick={() => setSettings({ ...settings, cod_enabled: !settings.cod_enabled })}
              className={`cursor-pointer select-none text-xs font-bold px-2.5 py-1 rounded-xl transition border ${
                settings.cod_enabled
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
              }`}
            >
              {settings.cod_enabled ? '✓ COD Aktif' : '✕ COD Nonaktif'}
            </span>
          </div>
        </div>

        {!settings.cod_enabled && (
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-amber-50 border border-amber-200/80 rounded-2xl text-amber-800 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Metode COD saat ini <strong>Nonaktif</strong>. Pasien tidak akan melihat opsi bayar di tempat (COD) saat checkout di keranjang.
            </span>
          </div>
        )}
      </div>
    </form>
  );
}

