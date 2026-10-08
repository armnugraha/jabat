'use client';

import React, { useState, useEffect } from 'react';
import { Store, Save, Clock, Bike, CreditCard, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';
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
    cod_enabled: true,
    min_order_amount: 10000,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/store')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setSettings(json.data);
        }
      })
      .catch((err) => console.error('Failed to load store settings:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/store', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (json.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save store settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-2 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
        <span className="text-xs">Memuat pengaturan apotek dari Supabase...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Toast */}
      {saved && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Pengaturan apotek berhasil diperbarui di Supabase!</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">
            Pengaturan Apotek & Layanan Farmasi
          </h2>
          <p className="text-xs text-slate-500">
            Konfigurasi jam operasional, SIPA Apoteker, kurir pengiriman, dan rekening bank
          </p>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs flex items-center gap-2 shadow-md transition disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
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
              Nama Apotek
            </label>
            <input
              type="text"
              value={settings.store_name}
              onChange={(e) =>
                setSettings({ ...settings, store_name: e.target.value })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 font-semibold focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nama Apoteker Penanggung Jawab
            </label>
            <input
              type="text"
              value={settings.pharmacist_name}
              onChange={(e) =>
                setSettings({ ...settings, pharmacist_name: e.target.value })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 font-semibold focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nomor Surat Izin Praktik Apoteker (SIPA)
            </label>
            <input
              type="text"
              value={settings.pharmacist_sipa}
              onChange={(e) =>
                setSettings({ ...settings, pharmacist_sipa: e.target.value })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 font-mono font-bold text-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nomor Telepon / WhatsApp Apotek
            </label>
            <input
              type="text"
              value={settings.phone}
              onChange={(e) =>
                setSettings({ ...settings, phone: e.target.value })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 font-mono focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block font-bold text-slate-700 mb-1">
              Alamat Lengkap Apotek
            </label>
            <input
              type="text"
              value={settings.address}
              onChange={(e) =>
                setSettings({ ...settings, address: e.target.value })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Pengaturan Jam Operasional & Biaya Pengiriman */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-stitch space-y-4">
        <h3 className="text-xs font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
          <Bike className="w-4 h-4 text-sky-600" />
          <span>2. Jam Buka & Biaya Pengiriman Kurir</span>
        </h3>

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
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 font-semibold focus:outline-none"
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
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 font-semibold focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Ongkir Kurir Express (Rp)
            </label>
            <input
              type="number"
              step="1000"
              value={settings.express_delivery_fee}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  express_delivery_fee: Number(e.target.value),
                })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 font-extrabold text-sky-700 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Ongkir Reguler Sameday (Rp)
            </label>
            <input
              type="number"
              step="1000"
              value={settings.regular_delivery_fee}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  regular_delivery_fee: Number(e.target.value),
                })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 font-extrabold text-sky-700 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Ambang Gratis Ongkir (Rp)
            </label>
            <input
              type="number"
              step="5000"
              value={settings.free_delivery_threshold}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  free_delivery_threshold: Number(e.target.value),
                })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 font-extrabold text-emerald-700 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Pengaturan Pembayaran */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-stitch space-y-4">
        <h3 className="text-xs font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-emerald-600" />
          <span>3. Rekening Pembayaran Manual</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nama Bank
            </label>
            <input
              type="text"
              value={settings.bank_name}
              onChange={(e) =>
                setSettings({ ...settings, bank_name: e.target.value })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 font-semibold focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Nomor Rekening
            </label>
            <input
              type="text"
              value={settings.bank_account_number}
              onChange={(e) =>
                setSettings({ ...settings, bank_account_number: e.target.value })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 font-mono font-bold text-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Atas Nama (Holder)
            </label>
            <input
              type="text"
              value={settings.bank_account_holder}
              onChange={(e) =>
                setSettings({ ...settings, bank_account_holder: e.target.value })
              }
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 font-semibold focus:outline-none"
            />
          </div>
        </div>
      </div>
    </form>
  );
}
