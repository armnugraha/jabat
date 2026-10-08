'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import { Header } from '@/components/customer/Header';
import { BottomNav } from '@/components/customer/BottomNav';
import {
  HeroBanner,
  FreeShippingBanner,
  PharmacistConsultationCTA,
  StoreInfoFooterCard,
} from '@/components/customer/PromoBanners';
import { CategoryGrid } from '@/components/customer/CategoryGrid';
import { ProductCard } from '@/components/customer/ProductCard';
import { Product, Category } from '@/lib/types';
import { mockProducts, mockCategories } from '@/lib/data/mock-data';

export default function HomePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch products & categories concurrently from API endpoints
    Promise.all([
      fetch('/api/products?featured=true').then((res) => res.json()),
      fetch('/api/categories').then((res) => res.json()),
    ])
      .then(([prodJson, catJson]) => {
        if (prodJson.success && prodJson.data) {
          setProducts(prodJson.data);
        }
        if (catJson.success && catJson.data) {
          setCategories(catJson.data);
        }
      })
      .catch((err) => {
        console.error('Failed fetching data from API:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Header (Clean, no mode role) */}
      <Header />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 md:px-8 space-y-6 pt-4">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative max-w-3xl mx-auto w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari obat, resep, vitamin, sirup demam, alkes..."
            className="w-full bg-white border border-slate-200/90 rounded-2xl py-3.5 pl-11 pr-4 text-xs md:text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 shadow-sm transition"
          />
          <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </form>

        {/* Hero Banner */}
        <HeroBanner />

        {/* Main Categories Section (API Data) */}
        <div>
          <div className="flex items-center justify-between mb-3 px-0.5">
            <div>
              <h3 className="text-sm md:text-base font-bold text-slate-900 tracking-tight">
                Kategori Utama
              </h3>
              <p className="text-[11px] md:text-xs text-slate-500">
                Pilih kategori obat dan perlengkapan medis sesuai kebutuhan Anda
              </p>
            </div>
            <Link
              href="/products"
              className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-0.5"
            >
              <span>Lihat Semua</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <CategoryGrid categories={categories} />
        </div>

        {/* Promo & Consultation Banners (Side-by-Side on Desktop) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FreeShippingBanner />
          <PharmacistConsultationCTA />
        </div>

        {/* Featured Products Section (API Data) */}
        <div>
          <div className="flex items-center justify-between mb-3 px-0.5">
            <div>
              <h3 className="text-sm md:text-base font-bold text-slate-900 tracking-tight">
                Produk Terlaris & Terpercaya
              </h3>
              <p className="text-[11px] md:text-xs text-slate-500">
                Keaslian dijamin farmasi, dikemas langsung oleh staf apotek
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200/70 text-[11px] font-semibold shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
              <span>Stok Siap Kirim</span>
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-7 h-7 animate-spin text-sky-600" />
              <span className="text-xs md:text-sm">Memuat produk apotek...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3.5 md:gap-4 mt-3">
              {products.slice(0, 8).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>

        {/* Store Information Card */}
        <StoreInfoFooterCard />
      </main>

      {/* Fixed Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
