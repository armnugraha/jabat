'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Boxes,
  Search,
  ArrowLeft,
  ChevronRight,
  Filter,
  Sparkles,
  Baby,
  Heart,
  Brain,
  ShieldAlert,
  ShoppingBag,
  Check,
  Plus,
  Loader2,
} from 'lucide-react';
import { Header } from '@/components/customer/Header';
import { BottomNav } from '@/components/customer/BottomNav';
import { BundlingPackage } from '@/lib/types';
import { mockBundlingPackages } from '@/lib/data/mock-data';
import { useCart } from '@/lib/store/cart-context';
import { formatRupiah } from '@/lib/utils';

function BundlesContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';

  const [bundles, setBundles] = useState<BundlingPackage[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [addedBundleId, setAddedBundleId] = useState<string | null>(null);

  const { addBundle } = useCart();

  useEffect(() => {
    setIsLoading(true);
    fetch('/api/bundling?active=true')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setBundles(json.data);
        } else {
          setBundles([]);
        }
      })
      .catch((err) => {
        console.warn('Bundling sync notice:', err);
        setBundles([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    bundles.forEach((b) => {
      if (b.category) set.add(b.category);
    });
    return Array.from(set);
  }, [bundles]);

  const filteredBundles = useMemo(() => {
    return bundles.filter((b) => {
      const matchCat =
        activeCategory === 'all' ||
        b.category.toLowerCase() === activeCategory.toLowerCase();
      const matchQ =
        !searchQuery.trim() ||
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.items.some((it) => it.product?.name.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchQ;
    });
  }, [bundles, activeCategory, searchQuery]);

  const handleBuyBundle = (bundle: BundlingPackage) => {
    addBundle(bundle);
    setAddedBundleId(bundle.id);
    setTimeout(() => {
      setAddedBundleId(null);
    }, 2500);
  };

  const getCategoryMeta = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('hamil')) {
      return {
        icon: Baby,
        color: 'text-rose-600 bg-rose-50 border-rose-200/60',
      };
    }
    if (lower.includes('menyusui')) {
      return {
        icon: Heart,
        color: 'text-pink-600 bg-pink-50 border-pink-200/60',
      };
    }
    if (lower.includes('otak')) {
      return {
        icon: Brain,
        color: 'text-indigo-600 bg-indigo-50 border-indigo-200/60',
      };
    }
    if (lower.includes('flu') || lower.includes('p3k')) {
      return {
        icon: ShieldAlert,
        color: 'text-amber-600 bg-amber-50 border-amber-200/60',
      };
    }
    return {
      icon: Sparkles,
      color: 'text-sky-600 bg-sky-50 border-sky-200/60',
    };
  };

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <Header />

      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 md:px-8 space-y-6 pt-4">
        {/* Breadcrumb / Top Bar */}
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-sky-600 flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Beranda</span>
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-bold">Katalog Paket Bundling</span>
        </div>

        {/* Hero Header */}
        <div className="bg-gradient-to-r from-sky-900 via-sky-800 to-indigo-900 text-white rounded-3xl p-6 sm:p-8 shadow-stitch relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-sky-200 border border-white/15 text-xs font-bold">
              <Boxes className="w-3.5 h-3.5" />
              <span>Paket Hemat Apotek Mandiri</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight">
              Koleksi Paket Bundling Terapi & Kesehatan
            </h1>
            <p className="text-xs sm:text-sm text-sky-100 leading-relaxed">
              Dapatkan rangkaian obat, vitamin, dan suplemen terpilih dengan harga paket spesial yang jauh lebih hemat dibanding membeli satuan.
            </p>
          </div>

          <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 opacity-10 pointer-events-none">
            <Boxes className="w-72 h-72 text-white" />
          </div>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-stitch space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari paket bundling (misal: ibu hamil, daya ingat otak, pelancar ASI)..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 pl-10 pr-4 text-xs sm:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
                activeCategory === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Paket ({bundles.length})
            </button>

            {categories.map((cat) => {
              const isSelected = activeCategory.toLowerCase() === cat.toLowerCase();
              const meta = getCategoryMeta(cat);
              const Icon = meta.icon;
              const count = bundles.filter((b) => b.category.toLowerCase() === cat.toLowerCase()).length;

              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-sky-500 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bundles Grid */}
        {isLoading ? (
          <div className="p-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
            <Loader2 className="w-8 h-8 animate-spin text-sky-600 mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Memuat katalog paket bundling...</p>
          </div>
        ) : filteredBundles.length === 0 ? (
          <div className="p-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200">
            <Boxes className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">Data Belum Tersedia</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Saat ini data paket bundling belum tersedia{activeCategory !== 'all' ? ` untuk kategori "${activeCategory}"` : ''}. Silakan pilih kategori lain atau periksa kembali nanti.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredBundles.map((bundle) => {
              const meta = getCategoryMeta(bundle.category);
              const Icon = meta.icon;
              const isAdded = addedBundleId === bundle.id;

              return (
                <div
                  key={bundle.id}
                  className="bg-white rounded-3xl border border-slate-200/90 hover:border-sky-300 p-5 shadow-stitch hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div>
                    {/* Top Bar: Category & Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${meta.color}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{bundle.category}</span>
                      </span>

                      {bundle.badge && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black bg-amber-50 text-amber-700 border border-amber-200/80">
                          <Sparkles className="w-3 h-3 text-amber-500" />
                          <span>{bundle.badge}</span>
                        </span>
                      )}
                    </div>

                    {/* Title & Description */}
                    <div className="mt-3">
                      <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                        {bundle.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                        {bundle.description}
                      </p>
                    </div>

                    {/* Items Chain */}
                    <div className="mt-4 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                        <span>Isi Paket Bundling ({bundle.items.length} Macam Obat / Suplemen):</span>
                      </div>

                      <div className="space-y-2">
                        {bundle.items.map((item, idx) => (
                          <div
                            key={item.id || idx}
                            className="flex items-center justify-between gap-3 p-2 rounded-xl bg-white border border-slate-200/60 shadow-2xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 p-1 flex items-center justify-center shrink-0">
                                <img
                                  src={item.product?.image_url || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80'}
                                  alt={item.product?.name || 'Produk'}
                                  className="w-full h-full object-contain mix-blend-multiply"
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[10px] font-black text-sky-700">
                                  {item.quantity}x {item.variant?.name || 'Sediaan'}
                                </div>
                                <div className="text-xs font-bold text-slate-800 truncate" title={item.product?.name}>
                                  {item.product?.name}
                                </div>
                              </div>
                            </div>

                            <span className="text-xs text-slate-500 font-mono shrink-0">
                              {item.variant ? formatRupiah(item.variant.price * item.quantity) : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Pricing & CTA */}
                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 -mx-5 -mb-5 p-5 rounded-b-3xl">
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
                            <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              Hemat {formatRupiah(savAmount)} ({savPct}%)
                            </span>
                          </div>
                          <div className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
                            {formatRupiah(bPrice)}
                          </div>
                        </div>
                      );
                    })()}

                    <button
                      onClick={() => handleBuyBundle(bundle)}
                      className={`px-5 py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98] ${
                        isAdded
                          ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                          : 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/20'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Paket Berhasil Ditambahkan!</span>
                        </>
                      ) : (
                        <>
                          <ShoppingBag className="w-4 h-4" />
                          <span>Beli Paket Sekaligus</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

export default function BundlesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
        </div>
      }
    >
      <BundlesContent />
    </Suspense>
  );
}
