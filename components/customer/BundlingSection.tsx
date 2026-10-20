'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Boxes,
  Sparkles,
  ShoppingBag,
  Plus,
  Check,
  ChevronRight,
  Baby,
  Heart,
  Brain,
  ShieldAlert,
  Loader2,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import { BundlingPackage } from '@/lib/types';
import { mockBundlingPackages } from '@/lib/data/mock-data';
import { useCart } from '@/lib/store/cart-context';
import { formatRupiah } from '@/lib/utils';

interface BundlingSectionProps {
  initialCategory?: string;
  limit?: number;
  showAllLink?: boolean;
  title?: string;
  subtitle?: string;
}

export function BundlingSection({
  initialCategory = 'all',
  limit,
  showAllLink = true,
  title = 'Paket Bundling Rekomendasi Apoteker',
  subtitle = 'Kombinasi obat & suplemen yang dirancang saling melengkapi untuk hasil terapi maksimal dengan harga lebih hemat',
}: BundlingSectionProps) {
  const [bundles, setBundles] = useState<BundlingPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>(initialCategory);
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

  // Unique categories from active bundles
  const categories = useMemo(() => {
    const set = new Set<string>();
    bundles.forEach((b) => {
      if (b.category) set.add(b.category);
    });
    return Array.from(set);
  }, [bundles]);

  // Filtered bundles
  const displayedBundles = useMemo(() => {
    let result = bundles;
    if (activeCategory !== 'all') {
      result = result.filter(
        (b) => b.category.toLowerCase() === activeCategory.toLowerCase()
      );
    }
    if (limit && limit > 0) {
      result = result.slice(0, limit);
    }
    return result;
  }, [bundles, activeCategory, limit]);

  const handleBuyBundle = (bundle: BundlingPackage) => {
    addBundle(bundle);
    setAddedBundleId(bundle.id);
    setTimeout(() => {
      setAddedBundleId(null);
    }, 2500);
  };

  // Helper for Category styling & icon
  const getCategoryMeta = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('hamil')) {
      return {
        icon: Baby,
        color: 'text-rose-600 bg-rose-50 border-rose-200/60',
        badgeColor: 'bg-rose-500',
      };
    }
    if (lower.includes('menyusui')) {
      return {
        icon: Heart,
        color: 'text-pink-600 bg-pink-50 border-pink-200/60',
        badgeColor: 'bg-pink-500',
      };
    }
    if (lower.includes('otak')) {
      return {
        icon: Brain,
        color: 'text-indigo-600 bg-indigo-50 border-indigo-200/60',
        badgeColor: 'bg-indigo-500',
      };
    }
    if (lower.includes('flu') || lower.includes('p3k')) {
      return {
        icon: ShieldAlert,
        color: 'text-amber-600 bg-amber-50 border-amber-200/60',
        badgeColor: 'bg-amber-500',
      };
    }
    return {
      icon: Sparkles,
      color: 'text-sky-600 bg-sky-50 border-sky-200/60',
      badgeColor: 'bg-sky-500',
    };
  };

  if (!isLoading && bundles.length === 0) {
    return (
      <section className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 px-0.5">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200/60 text-[10px] sm:text-[11px] font-bold mb-1.5">
              <Boxes className="w-3.5 h-3.5 text-sky-600" />
              <span>Kategori Bundling Hemat</span>
            </div>
            <h3 className="text-sm md:text-base font-extrabold text-slate-900 tracking-tight">
              {title}
            </h3>
            <p className="text-[11px] md:text-xs text-slate-500 max-w-2xl leading-relaxed mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="p-10 bg-white rounded-3xl border border-slate-200/80 text-center space-y-2 shadow-stitch">
          <Boxes className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-700">Data belum tersedia</p>
          <p className="text-[11px] text-slate-400">
            Saat ini belum ada paket bundling yang tersedia.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4 pt-2">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 px-0.5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200/60 text-[10px] sm:text-[11px] font-bold mb-1.5">
            <Boxes className="w-3.5 h-3.5 text-sky-600" />
            <span>Kategori Bundling Hemat</span>
          </div>
          <h3 className="text-sm md:text-base font-extrabold text-slate-900 tracking-tight">
            {title}
          </h3>
          <p className="text-[11px] md:text-xs text-slate-500 max-w-2xl leading-relaxed mt-0.5">
            {subtitle}
          </p>
        </div>

        {showAllLink && (
          <Link
            href="/bundles"
            className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-0.5 shrink-0 self-start sm:self-auto"
          >
            <span>Lihat Semua Paket</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Category Filter Chips */}
      {categories.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap ${
              activeCategory === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
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
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Bundles Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-stitch animate-pulse space-y-4"
            >
              <div className="h-5 bg-slate-200 rounded-lg w-1/3" />
              <div className="h-6 bg-slate-200 rounded-lg w-3/4" />
              <div className="h-20 bg-slate-100 rounded-2xl" />
              <div className="h-10 bg-slate-200 rounded-xl" />
            </div>
          ))}
        </div>
      ) : displayedBundles.length === 0 ? (
        <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-2 shadow-stitch">
          <Boxes className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-700">Data belum tersedia</p>
          <p className="text-[11px] text-slate-400">
            Saat ini belum ada paket bundling untuk kategori {activeCategory !== 'all' ? `"${activeCategory}"` : 'ini'}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
          {displayedBundles.map((bundle) => {
            const meta = getCategoryMeta(bundle.category);
            const Icon = meta.icon;
            const isAdded = addedBundleId === bundle.id;

            return (
              <div
                key={bundle.id}
                className="bg-white rounded-3xl border border-slate-200/90 hover:border-sky-300 p-4 sm:p-5 shadow-stitch hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
              >
                <div>
                  {/* Top Header: Category Tag & Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold border ${meta.color}`}
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
                    <h4 className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-sky-700 transition leading-snug">
                      {bundle.name}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {bundle.description}
                    </p>
                  </div>

                  {/* Product Items Chain Preview */}
                  <div className="mt-4 p-3 rounded-2xl bg-slate-50/80 border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Termasuk Dalam Paket:</span>
                      <span className="text-sky-600 font-bold">{bundle.items.length} Macam Obat / Suplemen</span>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                      {bundle.items.map((item, idx) => (
                        <React.Fragment key={item.id || idx}>
                          <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200/80 shrink-0 shadow-2xs">
                            <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 p-1 flex items-center justify-center shrink-0">
                              <img
                                src={item.product?.image_url || 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80'}
                                alt={item.product?.name || 'Produk'}
                                className="w-full h-full object-contain mix-blend-multiply"
                              />
                            </div>
                            <div className="min-w-0 max-w-[130px]">
                              <div className="text-[10px] font-black text-sky-700">
                                {item.quantity}x {item.variant?.name || 'Item'}
                              </div>
                              <div className="text-[11px] font-bold text-slate-800 truncate" title={item.product?.name}>
                                {item.product?.name}
                              </div>
                            </div>
                          </div>

                          {idx < bundle.items.length - 1 && (
                            <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center shrink-0 font-bold text-xs">
                              <Plus className="w-3 h-3" />
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Pricing & Add to Cart Action */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60 -mx-4 -mb-4 sm:-mx-5 sm:-mb-5 p-4 sm:p-5 rounded-b-3xl">
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
                        <div className="text-base sm:text-lg font-black text-slate-900 mt-0.5">
                          {formatRupiah(bPrice)}
                        </div>
                      </div>
                    );
                  })()}

                  <button
                    onClick={() => handleBuyBundle(bundle)}
                    className={`px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98] ${
                      isAdded
                        ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                        : 'bg-sky-600 hover:bg-sky-700 text-white shadow-sky-600/20'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>Paket Masuk Keranjang!</span>
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
    </section>
  );
}
