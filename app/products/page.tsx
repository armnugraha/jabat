'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  SlidersHorizontal,
  ShieldCheck,
  ShoppingBag,
  ArrowRight,
  Package,
  ChevronDown,
  Loader2,
  Heart,
  X,
  Check,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Header } from '@/components/customer/Header';
import { BottomNav } from '@/components/customer/BottomNav';
import { ProductCard } from '@/components/customer/ProductCard';
import { Product, Category } from '@/lib/types';
import { mockProducts, mockCategories } from '@/lib/data/mock-data';
import { useCart } from '@/lib/store/cart-context';
import { useWishlist } from '@/lib/store/wishlist-context';
import { formatRupiah } from '@/lib/utils';

function ProductsContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';
  const initialQuery = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [sortBy, setSortBy] = useState<'terpopuler' | 'termurah' | 'termahal' | 'nama_asc' | 'nama_desc' | 'diskon'>('terpopuler');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Advanced Filter Modal States
  const [filterPrescription, setFilterPrescription] = useState<'all' | 'false' | 'true'>('all');
  const [filterMinPrice, setFilterMinPrice] = useState<string>('');
  const [filterMaxPrice, setFilterMaxPrice] = useState<string>('');
  const [filterPromoOnly, setFilterPromoOnly] = useState(false);
  const [filterInStockOnly, setFilterInStockOnly] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { itemCount, subtotal } = useCart();
  const { wishlistItems, wishlistCount } = useWishlist();

  // Load categories from API on mount
  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data && json.data.length > 0) {
          setCategories(json.data);
        } else {
          setCategories(mockCategories);
        }
      })
      .catch(() => setCategories(mockCategories));
  }, []);

  // Sync category from URL search params
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) setActiveCategory(cat);
    const q = searchParams.get('q');
    if (q) setSearchQuery(q);
  }, [searchParams]);

  // Fetch products from API whenever activeCategory, searchQuery, or sortBy changes
  useEffect(() => {
    if (activeCategory === 'wishlist') {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const params = new URLSearchParams();
    if (activeCategory && activeCategory !== 'all') {
      params.set('category', activeCategory);
    }
    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim());
    }
    if (sortBy) {
      params.set('sort', sortBy);
    }
    if (filterPrescription !== 'all') {
      params.set('requires_prescription', filterPrescription);
    }
    if (filterMinPrice) {
      params.set('min_price', filterMinPrice);
    }
    if (filterMaxPrice) {
      params.set('max_price', filterMaxPrice);
    }

    fetch(`/api/products?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setProducts(json.data);
        } else {
          setProducts(mockProducts);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch products:', err);
        setProducts(mockProducts);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [activeCategory, searchQuery, sortBy, filterPrescription, filterMinPrice, filterMaxPrice]);

  // Merge tags: Preset tags + Dynamic categories from API
  const filterTabs = useMemo(() => {
    const tabs: { id: string; label: string; dot?: string; icon?: any }[] = [
      { id: 'all', label: 'Semua', icon: Package },
      { id: 'wishlist', label: `Favorit (${wishlistCount})`, icon: Heart, dot: 'bg-rose-500' },
      { id: 'obat-bebas', label: 'Obat Bebas', dot: 'bg-emerald-500' },
      { id: 'resep', label: 'Wajib Resep', dot: 'bg-rose-500' },
    ];

    categories.forEach((cat) => {
      if (!tabs.some((t) => t.id === cat.slug)) {
        tabs.push({
          id: cat.slug,
          label: cat.name,
        });
      }
    });

    return tabs;
  }, [categories, wishlistCount]);

  // Displayed products (handle wishlist view and client-side promo/stock filters)
  const displayedProducts = useMemo(() => {
    let list = activeCategory === 'wishlist' ? wishlistItems : products;

    if (searchQuery.trim() && activeCategory === 'wishlist') {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          (p.indications && p.indications.toLowerCase().includes(q))
      );
    }

    if (filterPromoOnly) {
      list = list.filter((p) =>
        p.variants.some((v) => (v.discount_percentage || 0) > 0 || (v.strike_price && v.strike_price > v.price))
      );
    }

    if (filterInStockOnly) {
      list = list.filter((p) => p.variants.some((v) => (v.stock || 0) > 0));
    }

    // Client sort for wishlist or cached list
    const sorted = [...list];
    if (sortBy === 'termurah') {
      sorted.sort((a, b) => (a.variants[0]?.price || 0) - (b.variants[0]?.price || 0));
    } else if (sortBy === 'termahal') {
      sorted.sort((a, b) => (b.variants[0]?.price || 0) - (a.variants[0]?.price || 0));
    } else if (sortBy === 'nama_asc') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'nama_desc') {
      sorted.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortBy === 'diskon') {
      sorted.sort((a, b) => {
        const dA = Math.max(...a.variants.map((v) => v.discount_percentage || 0));
        const dB = Math.max(...b.variants.map((v) => v.discount_percentage || 0));
        return dB - dA;
      });
    }

    return sorted;
  }, [activeCategory, wishlistItems, products, searchQuery, filterPromoOnly, filterInStockOnly, sortBy]);

  // Count active extra filters
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterPrescription !== 'all') count++;
    if (filterMinPrice) count++;
    if (filterMaxPrice) count++;
    if (filterPromoOnly) count++;
    if (filterInStockOnly) count++;
    return count;
  }, [filterPrescription, filterMinPrice, filterMaxPrice, filterPromoOnly, filterInStockOnly]);

  const handleResetFilters = () => {
    setFilterPrescription('all');
    setFilterMinPrice('');
    setFilterMaxPrice('');
    setFilterPromoOnly(false);
    setFilterInStockOnly(false);
    setSearchQuery('');
    setActiveCategory('all');
    setSortBy('terpopuler');
  };

  const sortLabels = {
    terpopuler: 'Terpopuler',
    termurah: 'Harga: Termurah',
    termahal: 'Harga: Termahal',
    nama_asc: 'Nama: A – Z',
    nama_desc: 'Nama: Z – A',
    diskon: 'Diskon Terbesar',
  };

  return (
    <div className="flex flex-col min-h-screen pb-28">
      {/* Top Header */}
      <Header />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 md:px-8 space-y-4 pt-4">
        {/* Search & Filter Bar */}
        <div className="flex items-center gap-2 max-w-3xl mx-auto w-full">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari obat, vitamin, merk, keluhan..."
              className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-10 pr-4 text-xs md:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 shadow-sm transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Button (Opens Filter Modal) */}
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className={`p-3 rounded-2xl border transition shadow-sm shrink-0 flex items-center gap-1.5 relative ${
              activeFiltersCount > 0
                ? 'bg-sky-50 border-sky-300 text-sky-700 font-bold'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            aria-label="Filter Lanjutan"
            title="Filter Obat"
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFiltersCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-sky-600 text-white text-[9px] font-extrabold flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>

        {/* Category Pill Filters (Horizontal Scroll on Mobile, Wrapped on Desktop) */}
        <div className="flex items-center gap-2 overflow-x-auto md:flex-wrap pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none">
          {filterTabs.map((tab) => {
            const isActive = activeCategory === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-sm font-bold scale-[1.02]'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {tab.dot && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isActive ? 'bg-white' : tab.dot
                    }`}
                  />
                )}
                {Icon && (
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      tab.id === 'wishlist' && isActive
                        ? 'fill-white text-white'
                        : tab.id === 'wishlist'
                        ? 'text-rose-500 fill-rose-100'
                        : ''
                    }`}
                  />
                )}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Product Count & Sort Dropdown */}
        <div className="flex items-center justify-between py-1 px-0.5 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 font-medium">
            <Package className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {activeCategory === 'wishlist'
                ? `${displayedProducts.length} Produk di Favorit`
                : `${displayedProducts.length} Produk Siap Kirim`}
            </span>
          </div>

          {/* Sort Dropdown Selector */}
          <div className="relative">
            <button
              onClick={() => setIsSortOpen(!isSortOpen)}
              className="inline-flex items-center gap-1.5 text-slate-700 font-semibold bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-[11px] shadow-sm hover:border-slate-300 transition"
            >
              <span>{sortLabels[sortBy]}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSortOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setIsSortOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-2xl border border-slate-200 shadow-xl py-1.5 z-30 divide-y divide-slate-100 animate-in fade-in zoom-in-95">
                  {(Object.keys(sortLabels) as (keyof typeof sortLabels)[]).map((key) => {
                    const isCurrent = sortBy === key;
                    return (
                      <button
                        key={key}
                        onClick={() => {
                          setSortBy(key);
                          setIsSortOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center justify-between transition ${
                          isCurrent
                            ? 'bg-sky-50 text-sky-700 font-bold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span>{sortLabels[key]}</span>
                        {isCurrent && <Check className="w-3.5 h-3.5 text-sky-600" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-sky-600" />
            <span className="text-xs md:text-sm">Memuat katalog obat...</span>
          </div>
        ) : displayedProducts.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3.5 md:gap-4">
            {displayedProducts.map((product) => (
              <ProductCard key={product.id} product={product} showFavorite={true} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center my-6 max-w-lg mx-auto shadow-stitch">
            {activeCategory === 'wishlist' ? (
              <>
                <Heart className="w-10 h-10 text-rose-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800">Belum Ada Produk Favorit</h4>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Klik ikon hati pada produk obat atau vitamin untuk menyimpannya ke daftar favorit Anda.
                </p>
                <button
                  onClick={() => setActiveCategory('all')}
                  className="px-4 py-2 rounded-xl bg-sky-600 text-white font-bold text-xs shadow-sm hover:bg-sky-700 transition"
                >
                  Jelajahi Produk
                </button>
              </>
            ) : (
              <>
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800">Obat Tidak Ditemukan</h4>
                <p className="text-xs text-slate-500 mt-1 mb-4">
                  Tidak ada produk yang cocok dengan kriteria pencarian atau filter yang dipilih.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 rounded-xl bg-sky-600 text-white font-bold text-xs shadow-sm hover:bg-sky-700 transition flex items-center gap-1.5 mx-auto"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Semua Filter</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* Official Pharmacy Trust Banner (Stitch Screen 3) */}
        <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4 flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-sky-600 shrink-0" />
          <p className="text-xs text-slate-700 leading-snug font-medium">
            100% Produk Farmasi Resmi berizin BPOM & Kemenkes RI. Disimpan dalam temperatur standar farmasi.
          </p>
        </div>
      </main>

      {/* Advanced Filter Modal / Drawer */}
      {isFilterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-sky-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Filter Katalog Obat
                </h3>
              </div>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Section: Tipe Regulasi Obat */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-2">
                Jenis Resep & Sediaan
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'all', label: 'Semua' },
                  { id: 'false', label: 'Obat Bebas' },
                  { id: 'true', label: 'Wajib Resep' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilterPrescription(item.id as any)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border text-center transition ${
                      filterPrescription === item.id
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Section: Rentang Harga */}
            <div>
              <label className="block text-xs font-bold text-slate-900 mb-2">
                Rentang Harga (Rp)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Harga Min (cth: 10000)"
                  value={filterMinPrice}
                  onChange={(e) => setFilterMinPrice(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <input
                  type="number"
                  placeholder="Harga Max (cth: 100000)"
                  value={filterMaxPrice}
                  onChange={(e) => setFilterMaxPrice(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>

            {/* Filter Section: Checkbox Options */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                <span className="text-xs font-semibold text-slate-800">
                  Hanya Produk Diskon / Promo
                </span>
                <input
                  type="checkbox"
                  checked={filterPromoOnly}
                  onChange={(e) => setFilterPromoOnly(e.target.checked)}
                  className="w-4 h-4 text-sky-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer">
                <span className="text-xs font-semibold text-slate-800">
                  Hanya Produk Stok Tersedia
                </span>
                <input
                  type="checkbox"
                  checked={filterInStockOnly}
                  onChange={(e) => setFilterInStockOnly(e.target.checked)}
                  className="w-4 h-4 text-sky-600 rounded"
                />
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleResetFilters}
                className="w-1/3 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 flex items-center justify-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
              <button
                type="button"
                onClick={() => setIsFilterModalOpen(false)}
                className="w-2/3 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs"
              >
                Terapkan Filter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Cart Indicator Bar */}
      {itemCount > 0 && (
        <div className="fixed bottom-18 md:bottom-6 left-0 right-0 z-30 px-4 max-w-lg mx-auto pointer-events-auto">
          <Link
            href="/cart"
            className="w-full bg-slate-900/95 backdrop-blur-md text-white p-3.5 rounded-2xl flex items-center justify-between shadow-2xl hover:bg-slate-900 transition border border-slate-800"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {itemCount}
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-medium">
                  {itemCount} item di keranjang
                </div>
                <div className="text-sm font-bold text-white leading-tight">
                  {formatRupiah(subtotal)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 font-bold text-xs text-white transition">
              <span>Lihat Keranjang</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <ProductsContent />
    </Suspense>
  );
}
