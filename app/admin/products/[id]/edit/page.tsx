'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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
  Upload,
  X,
  FileImage,
} from 'lucide-react';
import { mockCategories, mockProducts } from '@/lib/data/mock-data';
import { Category, Product, ProductVariant } from '@/lib/types';
import { formatRupiah } from '@/lib/utils';

const PACKAGING_NAME_PRESETS = [
  'Tablet',
  'Strip',
  'Box',
  'Box / Kotak',
  'Botol / Sirup',
  'Tablet / Kaplet',
  'Sachet',
  'Ampul / Vial',
  'Tube / Salep',
  'Pcs / Satuan',
  'Lainnya',
];

const UNIT_PRESETS = [
  'tablet',
  'kapsul',
  'kaplet',
  'ml',
  'gram',
  'strip',
  'sachet',
  'botol',
  'pcs',
  'Lainnya',
];

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [categories, setCategories] = useState<Category[]>(mockCategories);

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [bpomNumber, setBpomNumber] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [requiresPrescription, setRequiresPrescription] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [indications, setIndications] = useState('');
  const [composition, setComposition] = useState('');
  const [dosage, setDosage] = useState('');
  const [precautions, setPrecautions] = useState('');
  const [storageInstructions, setStorageInstructions] = useState('');

  // Variants
  const [variants, setVariants] = useState<{
    id: string;
    name: string;
    customName?: string;
    unit: string;
    customUnit?: string;
    quantity_per_package: number;
    price: number;
    strike_price?: number;
    stock: number;
    is_active: boolean;
  }[]>([]);

  // Fetch product & categories
  useEffect(() => {
    setIsLoading(true);

    Promise.all([
      fetch(`/api/products/${id}`).then((res) => res.json()),
      fetch('/api/categories').then((res) => res.json()),
    ])
      .then(([prodJson, catJson]) => {
        if (catJson.success && catJson.data) {
          setCategories(catJson.data);
        }

        if (prodJson.success && prodJson.data) {
          const p: Product = prodJson.data;
          setName(p.name || '');
          setDescription(p.description || '');
          setCategoryId(p.category_id || p.category?.id || '');
          setBpomNumber(p.bpom_number || '');
          setManufacturer(p.manufacturer || '');
          setImageUrl(p.image_url || '');
          setRequiresPrescription(Boolean(p.requires_prescription));
          setIsActive(p.is_active !== false);
          setIsFeatured(Boolean(p.is_featured));
          setIndications(p.indications || '');
          setComposition(p.composition || '');
          setDosage(p.dosage || '');
          setPrecautions(p.precautions || '');
          setStorageInstructions(
            p.storage_instructions ||
              'Simpan pada suhu ruangan (<30°C), tempat sejuk dan kering, terlindung dari paparan cahaya matahari langsung.'
          );

          if (p.variants && p.variants.length > 0) {
            setVariants(
              p.variants.map((v) => ({
                id: v.id,
                name: v.name,
                customName: PACKAGING_NAME_PRESETS.includes(v.name) ? '' : v.name,
                unit: v.unit,
                customUnit: UNIT_PRESETS.includes(v.unit) ? '' : v.unit,
                quantity_per_package: v.quantity_per_package || 1,
                price: v.price || 0,
                strike_price: v.strike_price,
                stock: v.stock || 0,
                is_active: v.is_active !== false,
              }))
            );
          } else {
            setVariants([
              {
                id: `v-1`,
                name: 'Strip',
                unit: 'tablet',
                quantity_per_package: 10,
                price: 15000,
                stock: 50,
                is_active: true,
              },
            ]);
          }
        } else {
          setNotFound(true);
        }
      })
      .catch((err) => {
        console.error('Failed fetching edit product data:', err);
        setNotFound(true);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  const addVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        id: `v-new-${Date.now()}-${prev.length + 1}`,
        name: 'Box / Kotak',
        customName: '',
        unit: 'strip',
        customUnit: '',
        quantity_per_package: 10,
        price: 100000,
        stock: 20,
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

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'products');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (json.success && json.url) {
        setImageUrl(json.url);
      } else {
        alert(json.error || 'Gagal mengunggah foto');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Gagal mengunggah file foto ke server.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Nama produk obat wajib diisi.');
      return;
    }

    setIsSaving(true);
    try {
      const formattedVariants = variants.map((v) => {
        const finalName = v.name === 'Lainnya' ? v.customName || 'Satuan' : v.name;
        const finalUnit = v.unit === 'Lainnya' ? v.customUnit || 'pcs' : v.unit;

        return {
          id: v.id,
          name: finalName.trim(),
          unit: finalUnit.trim(),
          quantity_per_package: Number(v.quantity_per_package) || 1,
          price: Number(v.price) || 0,
          strike_price: v.strike_price ? Number(v.strike_price) : undefined,
          stock: Number(v.stock) || 0,
          is_active: v.is_active !== false,
        };
      });

      const payload = {
        name: name.trim(),
        description: description.trim(),
        category_id: categoryId,
        bpom_number: bpomNumber.trim(),
        manufacturer: manufacturer.trim(),
        image_url: imageUrl.trim(),
        requires_prescription: requiresPrescription,
        is_active: isActive,
        is_featured: isFeatured,
        indications: indications.trim(),
        composition: composition.trim(),
        dosage: dosage.trim(),
        precautions: precautions.trim(),
        storage_instructions: storageInstructions.trim(),
        variants: formattedVariants,
      };

      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        alert('Produk obat dan kemasan berhasil diperbarui!');
        router.push('/admin/products');
      } else {
        alert(json.error || 'Gagal memperbarui produk.');
      }
    } catch (err: any) {
      console.error('Failed updating product:', err);
      alert('Gagal memperbarui produk ke server.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!window.confirm(`Yakin ingin menghapus produk obat "${name || 'ini'}" dari katalog Apotek Jabat? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        alert('Produk obat berhasil dihapus dari sistem!');
        router.push('/admin/products');
      } else {
        alert(json.error || 'Gagal menghapus produk obat.');
      }
    } catch (err: any) {
      console.error('Delete product error:', err);
      alert('Gagal menghubungi server untuk menghapus produk obat.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
        <span className="text-xs text-slate-500 font-medium">Memuat data produk...</span>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-md mx-auto text-center py-16 px-4 space-y-4">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto border border-rose-200">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-base font-bold text-slate-900">Produk Obat Tidak Ditemukan</h2>
        <p className="text-xs text-slate-500">
          Produk dengan ID <code className="text-rose-600 font-mono font-semibold">{id}</code> tidak ditemukan atau telah dihapus dari sistem.
        </p>
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Daftar Produk</span>
        </Link>
      </div>
    );
  }

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
              Edit Produk Obat & Kemasan
            </h2>
            <p className="text-xs text-slate-500">
              Perbarui rincian obat, stok, dan satuan kemasan farmasi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isSaving || isDeleting}
            onClick={handleDeleteProduct}
            className="px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 font-bold text-xs flex items-center gap-2 transition active:scale-95 disabled:opacity-50"
            title="Hapus Produk Obat"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin text-rose-600" /> : <Trash2 className="w-4 h-4 text-rose-600" />}
            <span>Hapus Obat</span>
          </button>

          <button
            type="submit"
            disabled={isSaving || isDeleting}
            className="px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-sky-600/25 transition active:scale-95"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'Menyimpan Perubahan...' : 'Simpan Perubahan'}</span>
          </button>
        </div>
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
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-3.5 text-xs font-semibold text-slate-900 focus:outline-none"
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

          {/* Image Upload Component with Supabase Storage */}
          <div className="sm:col-span-2 space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Foto Produk Obat (Supabase Storage)
            </label>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-50 rounded-2xl p-3.5 border border-slate-200">
              <div className="w-20 h-20 rounded-2xl bg-white border border-slate-200 p-1 flex items-center justify-center overflow-hidden shrink-0">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="Preview"
                    className="w-full h-full object-contain mix-blend-multiply"
                  />
                ) : (
                  <FileImage className="w-8 h-8 text-slate-300" />
                )}
              </div>

              <div className="flex-1 space-y-2 w-full">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition"
                  >
                    {isUploadingImage ? (
                      <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
                    ) : (
                      <Upload className="w-4 h-4 text-sky-600" />
                    )}
                    <span>{isUploadingImage ? 'Mengunggah ke Storage...' : 'Ganti Foto Produk'}</span>
                  </button>
                </div>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Atau tempel URL gambar (https://...)"
                  className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-3 text-[11px] font-mono text-slate-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Deskripsi Produk
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan deskripsi produk (mendukung enter / baris baru)..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-medium text-slate-900 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Indikasi Umum & Manfaat
            </label>
            <textarea
              rows={2}
              value={indications}
              onChange={(e) => setIndications(e.target.value)}
              placeholder="Indikasi medis atau manfaat klinis obat..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs font-medium text-slate-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Kandungan / Komposisi Zat Aktif
            </label>
            <textarea
              rows={2}
              value={composition}
              onChange={(e) => setComposition(e.target.value)}
              placeholder="Tiap tablet mengandung..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2 px-3 text-xs focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Dosis & Aturan Minum
            </label>
            <textarea
              rows={2}
              value={dosage}
              onChange={(e) => setDosage(e.target.value)}
              placeholder="Dewasa: 1 tablet 3x sehari..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2 px-3 text-xs focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Peringatan & Perhatian (Kontraindikasi)
            </label>
            <textarea
              rows={2}
              value={precautions}
              onChange={(e) => setPrecautions(e.target.value)}
              placeholder="Hati-hati penggunaan pada pasien dengan..."
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
              Pilih nama kemasan dan satuan isi dari dropdown, atau pilih &quot;Lainnya&quot; untuk input manual.
            </p>
          </div>

          <button
            type="button"
            onClick={addVariant}
            className="px-3.5 py-1.5 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Kemasan</span>
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
                {/* Packaging Name Dropdown + Free Text */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Nama Kemasan
                  </label>
                  <select
                    value={PACKAGING_NAME_PRESETS.includes(v.name) ? v.name : 'Lainnya'}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateVariant(index, 'name', val);
                      if (val !== 'Lainnya') updateVariant(index, 'customName', '');
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-2.5 font-semibold text-slate-800 focus:outline-none"
                  >
                    {PACKAGING_NAME_PRESETS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  {(!PACKAGING_NAME_PRESETS.includes(v.name) || v.name === 'Lainnya') && (
                    <input
                      type="text"
                      value={v.customName || (v.name !== 'Lainnya' ? v.name : '')}
                      onChange={(e) => updateVariant(index, 'customName', e.target.value)}
                      placeholder="Ketik nama kemasan..."
                      className="w-full bg-white border border-sky-300 rounded-xl py-1.5 px-2.5 text-xs font-bold text-sky-800 focus:outline-none"
                    />
                  )}
                </div>

                {/* Satuan Isi Dropdown + Free Text */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Satuan Isi
                  </label>
                  <select
                    value={UNIT_PRESETS.includes(v.unit) ? v.unit : 'Lainnya'}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateVariant(index, 'unit', val);
                      if (val !== 'Lainnya') updateVariant(index, 'customUnit', '');
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-2.5 font-semibold text-slate-800 focus:outline-none"
                  >
                    {UNIT_PRESETS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                  {(!UNIT_PRESETS.includes(v.unit) || v.unit === 'Lainnya') && (
                    <input
                      type="text"
                      value={v.customUnit || (v.unit !== 'Lainnya' ? v.unit : '')}
                      onChange={(e) => updateVariant(index, 'customUnit', e.target.value)}
                      placeholder="Ketik satuan isi..."
                      className="w-full bg-white border border-sky-300 rounded-xl py-1.5 px-2.5 text-xs font-bold text-sky-800 focus:outline-none"
                    />
                  )}
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
                    step="any"
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
                    step="any"
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

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          type="button"
          disabled={isSaving || isDeleting}
          onClick={handleDeleteProduct}
          className="px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 font-bold text-xs flex items-center gap-2 transition active:scale-95 disabled:opacity-50"
        >
          {isDeleting ? <Loader2 className="w-4 h-4 animate-spin text-rose-600" /> : <Trash2 className="w-4 h-4 text-rose-600" />}
          <span>Hapus Obat</span>
        </button>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/products"
            className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={isSaving || isDeleting}
            className="px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-sky-600/25 transition active:scale-95"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? 'Menyimpan Perubahan...' : 'Simpan Perubahan'}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
