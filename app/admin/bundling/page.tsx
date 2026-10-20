'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Boxes,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  ShoppingBag,
  Percent,
  Search,
  Check,
  X,
  ArrowRight,
  Filter,
  Eye,
  Heart,
  Baby,
  Brain,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Tag,
  HelpCircle,
  Package,
} from 'lucide-react';
import { BundlingPackage, BundlingItem, Product, ProductVariant } from '@/lib/types';
import { mockBundlingPackages, mockProducts } from '@/lib/data/mock-data';
import { formatRupiah } from '@/lib/utils';

// Standard preset categories
const PRESET_CATEGORIES = [
  'Ibu Hamil',
  'Ibu Menyusui',
  'Kesehatan Otak',
  'P3K & Demam Flu',
  'Daya Tahan & Imunitas',
  'Lambung & Pencernaan',
];

export default function AdminBundlingPage() {
  const [bundles, setBundles] = useState<BundlingPackage[]>([]);
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<BundlingPackage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Ibu Hamil');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [formCustomCategory, setFormCustomCategory] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formBadge, setFormBadge] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formBundlePrice, setFormBundlePrice] = useState<number | string>('');
  const [formItems, setFormItems] = useState<{
    product_id: string;
    variant_id: string;
    quantity: number;
  }[]>([]);

  // Load bundles & products from API
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [bundleRes, prodRes] = await Promise.all([
        fetch('/api/bundling?active=false'),
        fetch('/api/products'),
      ]);

      const bundleJson = await bundleRes.json();
      const prodJson = await prodRes.json();

      if (bundleJson.success && Array.isArray(bundleJson.data)) {
        setBundles(bundleJson.data);
      }
      if (prodJson.success && Array.isArray(prodJson.data)) {
        setProducts(prodJson.data);
      }
    } catch (err) {
      console.error('Failed loading bundling data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Unique categories list
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    PRESET_CATEGORIES.forEach((c) => set.add(c));
    bundles.forEach((b) => {
      if (b.category) set.add(b.category);
    });
    return Array.from(set);
  }, [bundles]);

  // Filtered bundles
  const filteredBundles = useMemo(() => {
    return bundles.filter((b) => {
      const matchesCategory =
        selectedCategory === 'all' ||
        b.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchesSearch =
        !searchQuery.trim() ||
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.items.some((it) => it.product?.name.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [bundles, selectedCategory, searchQuery]);

  // Stats
  const activeCount = bundles.filter((b) => b.is_active).length;
  const avgSavings =
    bundles.length > 0
      ? Math.round(bundles.reduce((acc, b) => acc + (b.savings_percentage || 0), 0) / bundles.length)
      : 0;

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setEditingBundle(null);
    setFormName('');
    setFormCategory('Ibu Hamil');
    setIsCustomCategory(false);
    setFormCustomCategory('');
    setFormDescription('');
    setFormBadge('');
    setFormImageUrl('');
    setFormIsActive(true);
    setFormBundlePrice('');

    // Pre-populate with first available product
    if (products.length > 0) {
      const p1 = products[0];
      setFormItems([
        {
          product_id: p1.id,
          variant_id: p1.variants?.[0]?.id || '',
          quantity: 1,
        },
      ]);
    } else {
      setFormItems([]);
    }

    setFeedback(null);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (bundle: BundlingPackage) => {
    setEditingBundle(bundle);
    setFormName(bundle.name);
    if (PRESET_CATEGORIES.includes(bundle.category)) {
      setFormCategory(bundle.category);
      setIsCustomCategory(false);
      setFormCustomCategory('');
    } else {
      setIsCustomCategory(true);
      setFormCustomCategory(bundle.category);
    }
    setFormDescription(bundle.description || '');
    setFormBadge(bundle.badge || '');
    setFormImageUrl(bundle.image_url || '');
    setFormIsActive(bundle.is_active);
    setFormBundlePrice(bundle.bundle_price);

    setFormItems(
      (bundle.items || []).map((it) => ({
        product_id: it.product_id,
        variant_id: it.variant_id,
        quantity: it.quantity || 1,
      }))
    );

    setFeedback(null);
    setIsModalOpen(true);
  };

  // Item list helpers in Form
  const handleAddItemToForm = () => {
    if (products.length === 0) return;
    const p = products[0];
    setFormItems((prev) => [
      ...prev,
      {
        product_id: p.id,
        variant_id: p.variants?.[0]?.id || '',
        quantity: 1,
      },
    ]);
  };

  const handleUpdateItemInForm = (
    index: number,
    field: 'product_id' | 'variant_id' | 'quantity',
    value: any
  ) => {
    setFormItems((prev) => {
      const copy = [...prev];
      const target = { ...copy[index] };
      if (field === 'product_id') {
        target.product_id = value;
        const newProd = products.find((p) => p.id === value);
        target.variant_id = newProd?.variants?.[0]?.id || '';
      } else if (field === 'variant_id') {
        target.variant_id = value;
      } else if (field === 'quantity') {
        target.quantity = Math.max(1, Number(value) || 1);
      }
      copy[index] = target;
      return copy;
    });
  };

  const handleRemoveItemFromForm = (index: number) => {
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Live calculation of Form Original Total
  const calculatedOriginalPrice = useMemo(() => {
    let sum = 0;
    for (const item of formItems) {
      const prod = products.find((p) => p.id === item.product_id);
      const vari = prod?.variants.find((v) => v.id === item.variant_id) || prod?.variants?.[0];
      const price = vari?.price || 0;
      sum += price * (item.quantity || 1);
    }
    return sum;
  }, [formItems, products]);

  const numericBundlePrice = Number(formBundlePrice) || 0;
  const calculatedSavings = Math.max(0, calculatedOriginalPrice - numericBundlePrice);
  const calculatedSavingsPct =
    calculatedOriginalPrice > 0 ? Math.round((calculatedSavings / calculatedOriginalPrice) * 100) : 0;

  // Save (Create or Edit)
  const handleSubmitBundle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setFeedback({ type: 'error', message: 'Nama paket bundling wajib diisi' });
      return;
    }

    const categoryToSave = isCustomCategory ? formCustomCategory.trim() : formCategory;
    if (!categoryToSave) {
      setFeedback({ type: 'error', message: 'Kategori bundling wajib diisi atau dipilih' });
      return;
    }

    if (formItems.length === 0) {
      setFeedback({ type: 'error', message: 'Pilih minimal 1 produk untuk paket bundling' });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const payload = {
      id: editingBundle?.id,
      name: formName.trim(),
      category: categoryToSave,
      description: formDescription.trim(),
      badge: formBadge.trim() ? formBadge.trim() : (editingBundle ? null : undefined),
      image_url: formImageUrl.trim() || undefined,
      original_price: calculatedOriginalPrice,
      bundle_price: numericBundlePrice > 0 ? numericBundlePrice : calculatedOriginalPrice,
      savings_amount: calculatedSavings,
      savings_percentage: calculatedSavingsPct,
      is_active: formIsActive,
      items: formItems.map((it) => {
        const prod = products.find((p) => p.id === it.product_id);
        const vari = prod?.variants.find((v) => v.id === it.variant_id) || prod?.variants?.[0];
        return {
          ...it,
          price: vari?.price || 0,
        };
      }),
    };

    try {
      const res = await fetch('/api/bundling', {
        method: editingBundle ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setFeedback({
          type: 'success',
          message: editingBundle ? 'Paket bundling berhasil diperbarui!' : 'Paket bundling baru berhasil disimpan!',
        });
        setTimeout(() => {
          setIsModalOpen(false);
          loadData();
        }, 800);
      } else {
        setFeedback({ type: 'error', message: json.error || 'Gagal menyimpan paket bundling.' });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Terjadi kesalahan jaringan.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Toggle active
  const handleToggleActive = async (bundle: BundlingPackage) => {
    const updatedStatus = !bundle.is_active;
    // Optimistic update
    setBundles((prev) =>
      prev.map((b) => (b.id === bundle.id ? { ...b, is_active: updatedStatus } : b))
    );

    try {
      await fetch('/api/bundling', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: bundle.id,
          is_active: updatedStatus,
          badge: bundle.badge || null,
        }),
      });
    } catch (err) {
      console.error('Failed toggling bundle status:', err);
    }
  };

  // Delete bundle
  const handleDeleteBundle = async (bundle: BundlingPackage) => {
    if (confirm(`Yakin ingin menghapus "${bundle.name}" dari sistem apotek?`)) {
      setBundles((prev) => prev.filter((b) => b.id !== bundle.id));
      try {
        await fetch(`/api/bundling?id=${encodeURIComponent(bundle.id)}`, {
          method: 'DELETE',
        });
      } catch (err) {
        console.error('Failed deleting bundle:', err);
      }
    }
  };

  // Category Icon & Color Helper
  const getCategoryTheme = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('hamil')) {
      return {
        bg: 'bg-rose-50 text-rose-700 border-rose-200/70',
        badgeBg: 'bg-rose-100 text-rose-800',
        icon: Baby,
      };
    }
    if (lower.includes('menyusui')) {
      return {
        bg: 'bg-pink-50 text-pink-700 border-pink-200/70',
        badgeBg: 'bg-pink-100 text-pink-800',
        icon: Heart,
      };
    }
    if (lower.includes('otak')) {
      return {
        bg: 'bg-indigo-50 text-indigo-700 border-indigo-200/70',
        badgeBg: 'bg-indigo-100 text-indigo-800',
        icon: Brain,
      };
    }
    if (lower.includes('flu') || lower.includes('p3k')) {
      return {
        bg: 'bg-amber-50 text-amber-700 border-amber-200/70',
        badgeBg: 'bg-amber-100 text-amber-800',
        icon: ShieldAlert,
      };
    }
    if (lower.includes('daya tahan') || lower.includes('imun')) {
      return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/70',
        badgeBg: 'bg-emerald-100 text-emerald-800',
        icon: ShieldCheck,
      };
    }
    if (lower.includes('lambung') || lower.includes('cerna') || lower.includes('pencernaan')) {
      return {
        bg: 'bg-orange-50 text-orange-700 border-orange-200/70',
        badgeBg: 'bg-orange-100 text-orange-800',
        icon: Activity,
      };
    }
    return {
      bg: 'bg-sky-50 text-sky-700 border-sky-200/70',
      badgeBg: 'bg-sky-100 text-sky-800',
      icon: Sparkles,
    };
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-sm">
              <Boxes className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              Kelola Kategori & Paket Bundling
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Atur paket pembelian hemat untuk kelompok kebutuhan spesifik: Ibu Hamil, Ibu Menyusui, Kesehatan Otak, dan lainnya
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 active:scale-[0.98] text-white text-xs font-bold shadow-md shadow-sky-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Paket Bundling Baru</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-stitch flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Total Paket Aktif
            </div>
            <div className="text-xl font-black text-slate-900 mt-0.5">
              {activeCount} <span className="text-xs font-normal text-slate-400">/ {bundles.length} Total</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-stitch flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Kategori Bundling
            </div>
            <div className="text-xl font-black text-slate-900 mt-0.5">
              {allCategories.length} <span className="text-xs font-normal text-slate-400">Kelompok Terdaftar</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-stitch flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Rata-rata Diskon Paket
            </div>
            <div className="text-xl font-black text-purple-600 mt-0.5">
              {avgSavings}% <span className="text-xs font-normal text-slate-400">Hemat untuk Pembeli</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-stitch space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama paket, kategori, atau produk di dalam paket..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2 pl-10 pr-4 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="text-xs text-slate-500 font-medium self-center sm:self-auto shrink-0">
            Menampilkan <strong className="text-slate-900">{filteredBundles.length}</strong> paket bundling
          </div>
        </div>

        {/* Category Pills Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua Kategori ({bundles.length})
          </button>

          {allCategories.map((cat) => {
            const count = bundles.filter((b) => b.category.toLowerCase() === cat.toLowerCase()).length;
            const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
            const theme = getCategoryTheme(cat);
            const Icon = theme.icon;

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                <span>{cat}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-sky-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bundles List */}
      {isLoading ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-stitch space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-sky-600 mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Memuat data paket bundling farmasi...</p>
        </div>
      ) : filteredBundles.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center shadow-stitch space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Boxes className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Data Belum Tersedia</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {selectedCategory === 'all'
                ? 'Saat ini data paket bundling belum tersedia. Silakan buat paket bundling pertama untuk mulai menawarkan promo hemat ke pelanggan.'
                : `Saat ini data paket bundling belum tersedia untuk kategori "${selectedCategory}".`}
            </p>
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Paket Sekarang</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredBundles.map((bundle) => {
            const theme = getCategoryTheme(bundle.category);
            const Icon = theme.icon;

            return (
              <div
                key={bundle.id}
                className={`bg-white rounded-3xl border transition-all p-5 shadow-stitch flex flex-col justify-between space-y-4 ${
                  bundle.is_active ? 'border-slate-200/80' : 'border-slate-200 bg-slate-50/50 opacity-75'
                }`}
              >
                <div>
                  {/* Top Bar: Category, Badge & Active Switch */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${theme.bg}`}>
                        <Icon className="w-3 h-3" />
                        <span>{bundle.category}</span>
                      </span>

                      {bundle.badge && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200/70">
                          <Sparkles className="w-3 h-3" />
                          <span>{bundle.badge}</span>
                        </span>
                      )}
                    </div>

                    {/* Active toggle */}
                    <button
                      onClick={() => handleToggleActive(bundle)}
                      title={bundle.is_active ? 'Paket Aktif (Klik untuk nonaktifkan)' : 'Paket Nonaktif (Klik untuk aktifkan)'}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        bundle.is_active ? 'bg-emerald-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          bundle.is_active ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Title & Description */}
                  <div className="mt-3">
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                      {bundle.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {bundle.description}
                    </p>
                  </div>

                  {/* Included Items Container */}
                  <div className="mt-4 p-3 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Item Dalam Paket:</span>
                      <span>{bundle.items?.length || 0} Produk</span>
                    </div>

                    <div className="space-y-1.5">
                      {bundle.items?.map((item, idx) => (
                        <div key={item.id || idx} className="flex items-center justify-between text-xs gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-5 h-5 rounded-md bg-white border border-slate-200 text-sky-700 font-black text-[10px] flex items-center justify-center shrink-0">
                              {item.quantity}x
                            </span>
                            <span className="font-semibold text-slate-800 truncate">
                              {item.product?.name || item.product_id}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 font-mono shrink-0">
                            {item.variant ? formatRupiah(item.variant.price * item.quantity) : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Pricing & Footer Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                  {(() => {
                    const itemsSum = (bundle.items || []).reduce(
                      (sum, it) => sum + (Number(it.variant?.price) || 0) * (Number(it.quantity) || 1),
                      0
                    );
                    const origPrice =
                      Number(bundle.original_price) > 0 && Number(bundle.original_price) >= Number(bundle.bundle_price)
                        ? Number(bundle.original_price)
                        : itemsSum > 0
                        ? itemsSum
                        : Number(bundle.bundle_price);
                    const bPrice = Number(bundle.bundle_price) || 0;
                    const savAmount = Math.max(0, origPrice - bPrice);
                    const savPct = origPrice > 0 ? Math.round((savAmount / origPrice) * 100) : 0;

                    return (
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-400 line-through">
                            {formatRupiah(origPrice)}
                          </span>
                          <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-lg border border-emerald-100">
                            Hemat {formatRupiah(savAmount)} ({savPct}%)
                          </span>
                        </div>
                        <div className="text-base font-black text-slate-900 mt-0.5">
                          {formatRupiah(bPrice)}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleOpenEditModal(bundle)}
                      className="p-2 rounded-xl text-slate-600 hover:text-sky-600 hover:bg-sky-50 border border-slate-200 transition"
                      title="Edit paket bundling"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteBundle(bundle)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition"
                      title="Hapus paket"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: Tambah / Edit Paket Bundling                                        */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl my-8 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
                  <Boxes className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {editingBundle ? 'Edit Paket Bundling' : 'Buat Paket Bundling Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Atur produk, kelompok bundling, dan harga khusus paket
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitBundle} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Feedback Alert */}
              {feedback && (
                <div
                  className={`p-3 rounded-2xl flex items-center gap-2 text-xs font-semibold ${
                    feedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  )}
                  <span>{feedback.message}</span>
                </div>
              )}

              {/* Nama Paket */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Paket Bundling *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Misal: Paket Nutrisi Ibu Hamil Trimester Awal"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {/* Kategori Bundling dengan Icon Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Pilih Kategori Bundling *</span>
                  <span className="text-[10px] font-normal text-slate-400">Pilih kategori sesuai kelompok kebutuhan</span>
                </label>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {PRESET_CATEGORIES.map((preset) => {
                      const theme = getCategoryTheme(preset);
                      const Icon = theme.icon;
                      const isSelected = !isCustomCategory && formCategory === preset;

                      return (
                        <button
                          type="button"
                          key={preset}
                          onClick={() => {
                            setFormCategory(preset);
                            setIsCustomCategory(false);
                          }}
                          className={`p-2.5 rounded-2xl text-xs font-bold border transition flex items-center gap-2.5 text-left group cursor-pointer ${
                            isSelected
                              ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                              : 'bg-slate-50/80 text-slate-700 border-slate-200/90 hover:bg-white hover:border-slate-300'
                          }`}
                        >
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-white text-slate-600 border border-slate-200 shadow-2xs group-hover:scale-105'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className="leading-snug line-clamp-1">{preset}</span>
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => setIsCustomCategory(true)}
                      className={`p-2.5 rounded-2xl text-xs font-bold border transition flex items-center gap-2.5 text-left group cursor-pointer ${
                        isCustomCategory
                          ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                          : 'bg-slate-50/80 text-slate-700 border-slate-200/90 hover:bg-white hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 transition ${
                          isCustomCategory
                            ? 'bg-white/20 text-white'
                            : 'bg-white text-slate-600 border border-slate-200 shadow-2xs group-hover:scale-105'
                        }`}
                      >
                        <Tag className="w-3.5 h-3.5" />
                      </div>
                      <span className="leading-snug line-clamp-1">+ Kategori Lain</span>
                    </button>
                  </div>

                  {isCustomCategory && (
                    <div className="pt-0.5 animate-fade-in">
                      <input
                        type="text"
                        required={isCustomCategory}
                        value={formCustomCategory}
                        onChange={(e) => setFormCustomCategory(e.target.value)}
                        placeholder="Ketik kategori baru (contoh: Lansia & Sendi, Anak Sehat, dll)..."
                        className="w-full bg-white border border-sky-300 rounded-2xl py-2 px-3 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Deskripsi Paket */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi Manfaat & Anjuran Konsumsi
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Jelaskan manfaat sinergi obat/suplemen dalam paket ini..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2 px-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {/* Badge & Status Aktif */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Label Promosi / Badge (Opsional)
                  </label>
                  <input
                    type="text"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    placeholder="Misal: Best Seller, Rekomendasi Bidan"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2 px-3 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="flex items-center justify-between sm:justify-start gap-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <input
                    type="checkbox"
                    id="bundle-active-cb"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 text-sky-600 rounded border-slate-300 focus:ring-sky-500"
                  />
                  <label htmlFor="bundle-active-cb" className="text-xs font-bold text-slate-800 cursor-pointer">
                    Aktifkan Paket Ini untuk Pembeli
                  </label>
                </div>
              </div>

              {/* =================================================================== */}
              {/* ITEM DALAM PAKET (PRODUCT PICKER)                                  */}
              {/* =================================================================== */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900">
                      Item Produk Dalam Paket *
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Pilih item obat/vitamin apa saja yang disertakan dalam paket ini
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItemToForm}
                    className="px-2.5 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-bold flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Item</span>
                  </button>
                </div>

                {formItems.length === 0 ? (
                  <div className="p-4 rounded-2xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
                    Belum ada produk yang dipilih. Klik tombol "+ Tambah Item" di atas.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {formItems.map((item, idx) => {
                      const selectedProd = products.find((p) => p.id === item.product_id);
                      const selectedVar =
                        selectedProd?.variants.find((v) => v.id === item.variant_id) ||
                        selectedProd?.variants[0];

                      return (
                        <div
                          key={idx}
                          className="p-3 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                              Produk #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveItemFromForm(idx)}
                              className="text-slate-400 hover:text-rose-600 transition p-1"
                              title="Hapus produk ini dari paket"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                            {/* Product Select */}
                            <div className="sm:col-span-6">
                              <select
                                value={item.product_id}
                                onChange={(e) =>
                                  handleUpdateItemInForm(idx, 'product_id', e.target.value)
                                }
                                className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                              >
                                {products.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Variant Select */}
                            <div className="sm:col-span-4">
                              <select
                                value={item.variant_id}
                                onChange={(e) =>
                                  handleUpdateItemInForm(idx, 'variant_id', e.target.value)
                                }
                                className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-2.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                              >
                                {selectedProd?.variants.map((v) => (
                                  <option key={v.id} value={v.id}>
                                    {v.name} ({formatRupiah(v.price)})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Quantity Input */}
                            <div className="sm:col-span-2 flex items-center gap-1">
                              <span className="text-[10px] font-semibold text-slate-400">Qty:</span>
                              <input
                                type="number"
                                min="1"
                                max="99"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdateItemInForm(idx, 'quantity', e.target.value)
                                }
                                className="w-full bg-white border border-slate-200 rounded-xl py-1.5 px-2 text-xs font-bold text-center text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* =================================================================== */}
              {/* HARGA PAKET & KALKULASI PENGHEMATAN                                */}
              {/* =================================================================== */}
              <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-semibold">Total Harga Normal (Kalkulasi):</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {formatRupiah(calculatedOriginalPrice)}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Harga Jual Paket Bundling (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formBundlePrice}
                    onChange={(e) => setFormBundlePrice(e.target.value)}
                    placeholder={`Ketik harga diskon, misal: ${Math.round(calculatedOriginalPrice * 0.85)}`}
                    className="w-full bg-white border border-slate-300 rounded-2xl py-2.5 px-3.5 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                {calculatedSavings > 0 && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-between text-xs text-emerald-800">
                    <span className="font-semibold">Potongan Pembeli:</span>
                    <span className="font-black">
                      Hemat {formatRupiah(calculatedSavings)} ({calculatedSavingsPct}%)
                    </span>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-xs font-bold text-white shadow-md shadow-sky-600/20 transition flex items-center gap-2"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingBundle ? 'Simpan Perubahan' : 'Buat Paket Sekarang'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
