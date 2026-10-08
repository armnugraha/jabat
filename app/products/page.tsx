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
} from 'lucide-react';
import { Header } from '@/components/customer/Header';
import { BottomNav } from '@/components/customer/BottomNav';
import { ProductCard } from '@/components/customer/ProductCard';
import { Product, Category } from '@/lib/types';
import { mockProducts, mockCategories } from '@/lib/data/mock-data';
import { useCart } from '@/lib/store/cart-context';
import { formatRupiah } from '@/lib/utils';

function ProductsContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';
  const initialQuery = searchParams.get('q') || '';

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { itemCount, subtotal } = useCart();

  // Load categories from API on mount
  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setCategories(json.data);
        }
      })
      .catch((err) => console.error('Failed to fetch categories:', err));
  }, []);

  // Fetch products from API whenever activeCategory or searchQuery changes
  useEffect(() => {
    setIsLoading(true);
    const params = new URLSearchParams();
    if (activeCategory && activeCategory !== 'all') {
      params.set('category', activeCategory);
    }
    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim());
    }

    fetch(`/api/products?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setProducts(json.data);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch products:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [activeCategory, searchQuery]);

  const filterTabs = useMemo(() => {
    const defaultTabs = [
      { id: 'all', label: 'Semua', icon: true },
      { id: 'obat-bebas', label: 'Obat Bebas', dot: 'bg-emerald-500' },
      { id: 'flu-batuk', label: 'Flu & Batuk' },
      { id: 'vitamin-suplemen', label: 'Vitamin & Suplemen', dot: 'bg-blue-500' },
      { id: 'alat-kesehatan', label: 'Alkes', dot: 'bg-indigo-500' },
      { id: 'resep', label: 'Wajib Resep', dot: 'bg-rose-500' },
    ];
    return defaultTabs;
  }, []);

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
          </div>
          <button
            className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition shadow-sm shrink-0"
            aria-label="Filter"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Category Pill Filters (Horizontal Scroll on Mobile, Wrapped on Desktop) */}
        <div className="flex items-center gap-2 overflow-x-auto md:flex-wrap pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none">
          {filterTabs.map((tab) => {
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-sm font-bold'
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
                {tab.icon && <Package className="w-3.5 h-3.5" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Product Count & Sort */}
        <div className="flex items-center justify-between py-1 px-0.5 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 font-medium">
            <Package className="w-3.5 h-3.5 text-emerald-600" />
            <span>{products.length} Produk Siap Kirim</span>
          </div>

          <div className="relative inline-flex items-center gap-1 text-slate-700 font-semibold bg-white px-2.5 py-1 rounded-xl border border-slate-200 text-[11px] shadow-sm">
            <span>Terpopuler</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </div>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-sky-600" />
            <span className="text-xs md:text-sm">Memuat katalog obat...</span>
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3.5 md:gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} showFavorite={true} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center my-6 max-w-lg mx-auto">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800">Obat Tidak Ditemukan</h4>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Tidak ada produk yang cocok dengan pencarian &quot;{searchQuery}&quot;.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveCategory('all');
              }}
              className="px-4 py-2 rounded-xl bg-sky-600 text-white font-bold text-xs shadow-sm hover:bg-sky-700 transition"
            >
              Reset Filter
            </button>
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

      {/* Floating Cart Indicator Bar (Stitch Screen 3) */}
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
