'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Image as ImageIcon,
  ShieldAlert,
  CheckCircle2,
  Package,
  Layers,
  Loader2,
} from 'lucide-react';
import { mockCategories } from '@/lib/data/mock-data';
import { Category, ProductVariant } from '@/lib/types';
import { formatRupiah } from '@/lib/utils';

export default function NewProductPage() {
  const router = useRouter();

  // Categories state
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [isSaving, setIsSaving] = useState(false);

  // Basic Info
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('c1');
  const [bpomNumber, setBpomNumber] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [imageUrl, setImageUrl] = useState(
    'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80'
  );
  const [requiresPrescription, setRequiresPrescription] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [indications, setIndications] = useState('');
  const [composition, setComposition] = useState('');
  const [dosage, setDosage] = useState('');
  const [precautions, setPrecautions] = useState('');

  // Fetch categories from API
  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setCategories(json.data);
          if (json.data.length > 0) setCategoryId(json.data[0].id);
        }
      })
      .catch((err) => console.error('Failed fetching categories:', err));
  }, []);

  // Variants / Packaging Builder
  const [variants, setVariants] = useState<Partial<ProductVariant>[]>([
    {
      id: 'v-new-1',
      name: 'Strip',
      unit: 'tablet',
      quantity_per_package: 10,
      price: 15000,
      strike_price: 18000,
      discount_percentage: 17,
      stock: 50,
      is_active: true,
    },
  ]);

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        id: `v-new-${Date.now()}`,
        name: 'Box',
        unit: 'strip',
        quantity_per_package: 10,
        price: 140000,
        strike_price: 175000,
        discount_percentage: 20,
        stock: 15,
        is_active: true,
      },
    ]);
  };

  const removeVariant = (index: number) => {
    if (variants.length <= 1) {
      alert('Produk harus memiliki minimal 1 satuan kemasan penjualan.');
      return;
    }
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, field: string, value: any) => {
    setVariants((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Nama produk obat wajib diisi.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        category_id: categoryId,
        bpom_number: bpomNumber.trim(),
        manufacturer: manufacturer.trim(),
        image_url: imageUrl.trim(),
        requires_prescription: requiresPrescription,
        is_active: isActive,
        indications: indications.trim(),
        composition: composition.trim(),
        dosage: dosage.trim(),
        precautions: precautions.trim(),
        variants,
      };

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        alert('Produk obat dan kemasan berhasil disimpan ke katalog!');
        router.push('/admin/products');
      } else {
        alert(json.error || 'Gagal menyimpan produk.');
      }
    } catch (err: any) {
      console.error('Failed saving product:', err);
      alert('Gagal menyimpan produk ke API.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">
              Tambah Obat & Atur Kemasan
            </h2>
            <p className="text-xs text-slate-500">
              Formulir lengkap pendaftaran obat sesuai standar farmasi BPOM
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-sky-600/25 transition active:scale-95"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>{isSaving ? 'Menyimpan...' : 'Simpan Produk'}</span>
        </button>
      </div>

      {/* Section 1: Informasi Dasar & Gambar */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-stitch space-y-4">
        <h3 className="text-xs font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
          <Package className="w-4 h-4 text-sky-600" />
          <span>1. Informasi Dasar Produk Obat</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nama Obat / Produk *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Paracetamol 500mg Strip (10 Tablet)"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-3.5 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Kategori Produk
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-3.5 text-xs font-medium text-slate-900 focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Produsen / Pabrik Farmasi
            </label>
            <input
              type="text"
              value={manufacturer}
              onChange={(e) => setManufacturer(e.target.value)}
              placeholder="Contoh: Kimia Farma, Kalbe, Phapros"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-3.5 text-xs font-medium text-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nomor Registrasi BPOM / AKL
            </label>
            <input
              type="text"
              value={bpomNumber}
              onChange={(e) => setBpomNumber(e.target.value)}
              placeholder="Contoh: DBL8504104210A1"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-3.5 text-xs font-medium text-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              URL Foto Produk Obat
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-3.5 text-xs font-medium text-slate-900 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Deskripsi & Indikasi Umum
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan manfaat obat dan kegunaannya..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-medium text-slate-900 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Regulasi & Status */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-stitch space-y-4">
        <h3 className="text-xs font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          <span>2. Regulasi Resep & Visibilitas</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="p-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 flex items-center justify-between cursor-pointer bg-slate-50/50">
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                Wajib Resep Dokter (Obat Keras)
              </span>
              <span className="text-[11px] text-slate-500">
                Customer wajib unggah resep saat checkout
              </span>
            </div>
            <input
              type="checkbox"
              checked={requiresPrescription}
              onChange={(e) => setRequiresPrescription(e.target.checked)}
              className="w-5 h-5 text-sky-600 rounded-lg"
            />
          </label>

          <label className="p-3.5 rounded-2xl border border-slate-200 hover:border-slate-300 flex items-center justify-between cursor-pointer bg-slate-50/50">
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                Tampilkan di Katalog (Aktif)
              </span>
              <span className="text-[11px] text-slate-500">
                Dapat dicari dan dibeli oleh customer
              </span>
            </div>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-5 h-5 text-sky-600 rounded-lg"
            />
          </label>
        </div>
      </div>

      {/* Section 3: Multi-Packaging / Variants Builder */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-stitch space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-600" />
              <span>3. Atur Varian Kemasan & Harga (Packaging Builder)</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Obat dapat dijual per Tablet, Strip, Botol, Box, dll.
            </p>
          </div>

          <button
            type="button"
            onClick={addVariant}
            className="px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold flex items-center gap-1 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Tambah Kemasan</span>
          </button>
        </div>

        <div className="space-y-3">
          {variants.map((v, index) => (
            <div
              key={v.id || index}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3 relative"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-sky-800">
                  Kemasan #{index + 1}
                </span>
                {variants.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeVariant(index)}
                    className="text-xs text-rose-500 hover:text-rose-700 font-bold flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nama Kemasan
                  </label>
                  <input
                    type="text"
                    value={v.name}
                    onChange={(e) => updateVariant(index, 'name', e.target.value)}
                    placeholder="Strip, Box, Botol"
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Satuan Isi
                  </label>
                  <input
                    type="text"
                    value={v.unit}
                    onChange={(e) => updateVariant(index, 'unit', e.target.value)}
                    placeholder="tablet, ml, sachet"
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Isi per Kemasan
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={v.quantity_per_package}
                    onChange={(e) =>
                      updateVariant(index, 'quantity_per_package', Number(e.target.value))
                    }
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 focus:outline-none font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Harga Jual (Rp) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={v.price}
                    onChange={(e) =>
                      updateVariant(index, 'price', Number(e.target.value))
                    }
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 focus:outline-none font-extrabold text-sky-700"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Harga Coret / Asli (Rp)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={v.strike_price || ''}
                    onChange={(e) =>
                      updateVariant(index, 'strike_price', Number(e.target.value))
                    }
                    placeholder="Opsional"
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Stok Tersedia
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={v.stock}
                    onChange={(e) =>
                      updateVariant(index, 'stock', Number(e.target.value))
                    }
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 focus:outline-none font-bold text-emerald-700"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </form>
  );
}
