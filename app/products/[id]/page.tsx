'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Heart,
  Share2,
  ShoppingBag,
  ShieldCheck,
  CheckCircle2,
  Zap,
  Building2,
  Thermometer,
  MessageCircle,
  Info,
  ChevronRight,
  Plus,
  Minus,
  Loader2,
  MapPin,
  Clock,
  Award,
} from 'lucide-react';
import { mockProducts, mockStoreSettings } from '@/lib/data/mock-data';
import { Product, ProductVariant, StoreSettings } from '@/lib/types';
import { useCart } from '@/lib/store/cart-context';
import { useWishlist } from '@/lib/store/wishlist-context';
import { useAuth } from '@/lib/store/auth-context';
import { formatRupiah } from '@/lib/utils';
import { ProductVariantSelector } from '@/components/customer/ProductVariantSelector';

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { id } = params;
  const { user } = useAuth();
  const { addItem, itemCount } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'indikasi' | 'komposisi' | 'dosis' | 'perhatian'>('indikasi');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Produk berhasil masuk keranjang!');
  const [isLoading, setIsLoading] = useState(true);
  const [store, setStore] = useState<StoreSettings>(mockStoreSettings);

  const isFavorite = product ? isInWishlist(product.id) || (product.slug && isInWishlist(product.slug)) : false;

  // Fetch store settings from API
  useEffect(() => {
    fetch('/api/store', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setStore(json.data);
        }
      })
      .catch((err) => console.error('Error loading store settings:', err));
  }, []);

  // Fetch product detail from API
  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/products/${id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setProduct(json.data);
          setSelectedVariant(json.data.variants?.[0] || null);
        } else {
          // Fallback to mock product
          const fallback = mockProducts.find((p) => p.id === id || p.slug === id) || mockProducts[0];
          setProduct(fallback);
          setSelectedVariant(fallback.variants[0]);
        }
      })
      .catch((err) => {
        console.error('Error loading product from API:', err);
        const fallback = mockProducts.find((p) => p.id === id || p.slug === id) || mockProducts[0];
        setProduct(fallback);
        setSelectedVariant(fallback.variants[0]);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  if (isLoading || !product || !selectedVariant) {
    return (
      <div className="flex flex-col min-h-screen bg-slate-50 items-center justify-center p-4">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600 mb-2" />
        <span className="text-xs text-slate-500 font-medium">Memuat informasi obat resmi...</span>
      </div>
    );
  }

  const handleAddToCart = () => {
    addItem(product, selectedVariant, quantity);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  const handleBuyNow = () => {
    addItem(product, selectedVariant, quantity);
    router.push('/cart');
  };

  const savings = selectedVariant.strike_price
    ? selectedVariant.strike_price - selectedVariant.price
    : 0;

  const handleFavoriteClick = () => {
    if (!product) return;
    if (!user) {
      setToastMessage('Silakan masuk ke akun untuk menyimpan produk favorit');
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        router.push('/account');
      }, 1500);
      return;
    }
    const added = toggleWishlist(product);
    setToastMessage(added ? 'Ditambahkan ke Favorit' : 'Dihapus dari Favorit');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  const isOutOfStock = (selectedVariant?.stock || 0) <= 0;
  const currentSubtotal = selectedVariant.price * (isOutOfStock ? 0 : quantity);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-28 lg:pb-16">
      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 py-3">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition border border-slate-200 bg-white shrink-0"
              aria-label="Kembali"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xs md:text-sm font-bold text-slate-900 leading-tight truncate">
                {store.store_name || 'Apotek JABAT'}
              </h1>
              <p className="text-[10px] md:text-xs text-slate-500 flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 text-sky-600 shrink-0 inline" />
                <span className="truncate">{store.address || store.branch_name || 'Bandung'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleFavoriteClick}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition border border-slate-200 bg-white"
              aria-label="Favorit"
            >
              <Heart
                className={`w-4.5 h-4.5 transition ${
                  isFavorite ? 'fill-rose-500 text-rose-500 scale-110' : ''
                }`}
              />
            </button>
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && navigator.share) {
                  navigator.share({
                    title: product.name,
                    url: window.location.href,
                  }).catch(() => {});
                }
              }}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition border border-slate-200 bg-white"
              aria-label="Bagikan"
            >
              <Share2 className="w-4.5 h-4.5" />
            </button>
            <Link
              href="/cart"
              className="relative p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition border border-slate-200 bg-white"
            >
              <ShoppingBag className="w-4.5 h-4.5 text-sky-600" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-sky-600 text-white text-[9px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>

      {/* Main 3-Column Grid Layout on Desktop */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* ========================================================================= */}
          {/* COLUMN 1 (LEFT): Card Foto & Badges Produk                                */}
          {/* ========================================================================= */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-20">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-stitch relative overflow-hidden">
              {/* Top Badges */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      product.requires_prescription
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        product.requires_prescription ? 'bg-rose-500' : 'bg-emerald-500'
                      }`}
                    />
                    {product.requires_prescription ? 'Wajib Resep' : 'Obat Bebas'}
                  </span>
                  {selectedVariant.discount_percentage && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-200">
                      Diskon -{selectedVariant.discount_percentage}%
                    </span>
                  )}
                </div>

                <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-bold shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                  <span>100% Resmi</span>
                </div>
              </div>

              {/* Product Image */}
              <div className="w-full aspect-[4/3] lg:aspect-square bg-slate-50 rounded-2xl flex items-center justify-center p-4 relative overflow-hidden border border-slate-100">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-contain mix-blend-multiply transition-transform hover:scale-105 duration-300"
                />
              </div>

              {/* Pagination Dots / Image Indicator */}
              <div className="flex items-center justify-center gap-1.5 mt-3">
                <span className="w-4 h-1.5 rounded-full bg-sky-600" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                <span className="text-[10px] text-slate-400 ml-2 font-medium">
                  1/3 Foto
                </span>
              </div>
            </div>

            {/* Quick Guarantees (Desktop view) */}
            <div className="hidden lg:grid grid-cols-2 gap-2 bg-white rounded-2xl border border-slate-200/80 p-3 shadow-stitch text-slate-600">
              <div className="flex items-center gap-2 text-[11px] font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Jaminan Obat Asli</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-medium">
                <Award className="w-4 h-4 text-sky-600 shrink-0" />
                <span>Apoteker Ber-SIPA</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* COLUMN 2 (CENTER): Detail Produk, BPOM, Konsultasi, Tabs & Rekomendasi     */}
          {/* ========================================================================= */}
          <div className="lg:col-span-5 space-y-5">
            {/* Product Details Header */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-stitch space-y-3.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate max-w-[200px] sm:max-w-xs">{product.manufacturer || 'Kimia Farma'} • {store.store_name || 'Apotek JABAT'}</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Terverifikasi
                </span>
              </div>

              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug">
                {product.name}
              </h2>

              <p className="text-xs text-slate-500">
                Satuan: <strong className="text-slate-700 font-semibold">{selectedVariant.name}</strong> @ {selectedVariant.quantity_per_package} {selectedVariant.unit} • Bebas Laktosa
              </p>

              {/* Price Block */}
              <div className="bg-sky-50/70 border border-sky-100 rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    Harga Resmi Apotek:
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-xl sm:text-2xl font-extrabold text-sky-700">
                      {formatRupiah(selectedVariant.price)}
                    </span>
                    {selectedVariant.strike_price && (
                      <span className="text-xs text-slate-400 line-through">
                        {formatRupiah(selectedVariant.strike_price)}
                      </span>
                    )}
                  </div>
                </div>

                {savings > 0 && (
                  <div className="px-2.5 py-1 rounded-xl bg-teal-100/90 text-teal-800 text-[11px] font-bold">
                    Hemat {formatRupiah(savings)}
                  </div>
                )}
              </div>

              {/* Packaging Selector Options */}
              {product.variants.length > 1 && (
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-900 mb-2">
                    Pilih Kemasan:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {product.variants.map((v) => {
                      const isSelected = selectedVariant.id === v.id;
                      return (
                        <button
                          key={v.id}
                          onClick={() => setSelectedVariant(v)}
                          className={`p-2.5 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'border-sky-600 bg-sky-50 text-sky-900 shadow-sm'
                              : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                          }`}
                        >
                          <div className="text-xs font-bold leading-tight truncate">{v.name}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {v.quantity_per_package} {v.unit}
                          </div>
                          <div className="text-xs font-extrabold text-sky-700 mt-1">
                            {formatRupiah(v.price)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Stock & Delivery Pills */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span className={`w-2 h-2 rounded-full ${isOutOfStock ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`} />
                  <strong className={isOutOfStock ? 'text-rose-700' : 'text-emerald-700'}>
                    {isOutOfStock ? 'Stok Habis' : 'Stok Tersedia'}
                  </strong>
                  <span className="text-slate-400">•</span>
                  <span>Sisa {selectedVariant.stock} {selectedVariant.name.toLowerCase()} di {store.branch_name || 'Apotek'}</span>
                </div>

                <div className="p-2.5 rounded-xl bg-sky-50/50 border border-sky-200/80 flex items-center gap-2 text-xs text-sky-800">
                  <Zap className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>
                    Tiba <strong className="font-bold">30–45 menit</strong> (Kurir Express {store.store_name || 'Apotek'})
                  </span>
                </div>
              </div>
            </div>

            {/* BPOM & Pharmacy Standards Box */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-stitch space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-600" />
                <h3 className="text-xs font-bold text-slate-900">
                  Standar & Regulasi Farmasi (BPOM)
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">
                    No. Reg BPOM
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5 truncate">
                    {product.bpom_number || 'DBL8504104210A1'}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Asli & Terregistrasi
                  </div>
                </div>

                <div className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase">
                    Apoteker PJ
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-0.5 line-clamp-1">
                    {store.pharmacist_name || mockStoreSettings.pharmacist_name}
                  </div>
                  <div className="text-[9px] text-slate-500 mt-1 font-mono truncate">
                    SIPA: {store.pharmacist_sipa || '19870412/SIPA/2021'}
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-blue-50/50 border border-blue-100 flex items-start gap-2 text-[11px] text-slate-700">
                <Thermometer className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900">Penyimpanan Obat Sesuai Standar:</strong>
                  <p className="mt-0.5 text-slate-600 leading-relaxed">
                    {product.storage_instructions || 'Simpan di tempat kering dan sejuk (di bawah 30°C), terlindung dari sinar matahari langsung.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Pharmacist Consultation Banner */}
            <div className="rounded-3xl bg-gradient-to-r from-sky-700 to-sky-800 text-white p-4 sm:p-5 shadow-stitch flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold text-sky-200 flex items-center gap-1 mb-0.5">
                  <MessageCircle className="w-3.5 h-3.5" /> Layanan Apoteker Siaga
                </div>
                <h4 className="text-xs sm:text-sm font-bold leading-tight">
                  Ragu Dosis & Aturan Minum?
                </h4>
                <p className="text-[10px] sm:text-xs text-sky-100 mt-0.5 leading-snug">
                  Konsultasikan keluhan atau riwayat alergi Anda dengan apoteker kami sekarang.
                </p>
              </div>
              <Link
                href="/chat"
                className="px-3.5 py-2 rounded-xl bg-white text-sky-800 font-bold text-xs shrink-0 shadow-md hover:bg-sky-50 transition"
              >
                Chat Gratis
              </Link>
            </div>

            {/* Tabbed Product Details */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-stitch space-y-3">
              {/* Tab Navigation */}
              <div className="flex border-b border-slate-100 overflow-x-auto scrollbar-none">
                <button
                  onClick={() => setActiveTab('indikasi')}
                  className={`pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${
                    activeTab === 'indikasi'
                      ? 'border-sky-600 text-sky-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Indikasi & Manfaat
                </button>
                <button
                  onClick={() => setActiveTab('komposisi')}
                  className={`pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${
                    activeTab === 'komposisi'
                      ? 'border-sky-600 text-sky-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Komposisi
                </button>
                <button
                  onClick={() => setActiveTab('dosis')}
                  className={`pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${
                    activeTab === 'dosis'
                      ? 'border-sky-600 text-sky-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Dosis & Aturan
                </button>
                <button
                  onClick={() => setActiveTab('perhatian')}
                  className={`pb-2.5 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${
                    activeTab === 'perhatian'
                      ? 'border-sky-600 text-sky-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Perhatian
                </button>
              </div>

              {/* Tab Content */}
              <div className="text-xs text-slate-600 leading-relaxed min-h-[80px]">
                {activeTab === 'indikasi' && (
                  <div className="space-y-3">
                    <h4 className="font-bold text-slate-900">Deskripsi & Indikasi Umum</h4>
                    <p>{product.description}</p>
                    {product.precautions && (
                      <div className="p-3 rounded-2xl bg-sky-50 border border-sky-100 flex items-start gap-2 text-sky-900 text-xs">
                        <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                        <span>{product.precautions}</span>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'komposisi' && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-900">Kandungan Zat Aktif</h4>
                    <p>{product.composition || 'Tiap tablet mengandung Paracetamol 500 mg.'}</p>
                  </div>
                )}

                {activeTab === 'dosis' && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-900">Dosis & Cara Penggunaan</h4>
                    <p>{product.dosage || 'Dewasa: 1-2 tablet 3-4 kali sehari sesudah makan.'}</p>
                  </div>
                )}

                {activeTab === 'perhatian' && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-slate-900">Peringatan & Kontraindikasi</h4>
                    <p>{product.precautions || 'Hati-hati penggunaan pada pasien dengan gangguan ginjal atau hati.'}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Frequently Bought Together */}
            <div>
              <div className="flex items-center justify-between mb-2 px-1">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Sering Dibeli Bersamaan
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    Lengkapi kebutuhan kesehatan keluarga
                  </p>
                </div>
                <Link
                  href="/products"
                  className="text-[11px] font-bold text-sky-600 flex items-center gap-0.5"
                >
                  <span>Lihat Semua</span>
                  <ChevronRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {mockProducts.slice(4, 6).map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-slate-200 p-3 flex flex-col justify-between shadow-stitch"
                  >
                    <div>
                      <div className="w-full aspect-[4/3] bg-slate-50 rounded-xl overflow-hidden mb-2">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-contain mix-blend-multiply"
                        />
                      </div>
                      <span className="text-[9px] font-semibold text-sky-600">
                        {item.manufacturer || 'Suplemen'}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                        {item.name}
                      </h4>
                      <div className="text-xs font-extrabold text-sky-700 mt-1">
                        {formatRupiah(item.variants[0]?.price || 10000)}
                      </div>
                    </div>

                    <button
                      onClick={() => addItem(item, item.variants[0], 1)}
                      className="mt-2 w-full py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-[11px] flex items-center justify-center gap-1 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* COLUMN 3 (RIGHT): Card Transaksi / Footer Desktop (Sticky Action Card)    */}
          {/* ========================================================================= */}
          <div className="hidden lg:block lg:col-span-3 lg:sticky lg:top-20 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-stitch space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-sm font-extrabold text-slate-900">
                  Atur Jumlah & Pesanan
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                  {selectedVariant.name} • {formatRupiah(selectedVariant.price)}
                </p>
              </div>

              {/* Quantity Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Jumlah Pembelian:</span>
                  <span className={`text-[11px] ${isOutOfStock ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                    {isOutOfStock ? 'Stok Habis' : `Stok: ${selectedVariant.stock}`}
                  </span>
                </div>

                <div className="flex items-center justify-between border border-slate-200 rounded-2xl p-1 bg-slate-50">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1 || isOutOfStock}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold shadow-2xs transition"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <input
                    type="number"
                    min="1"
                    max={selectedVariant.stock || 999}
                    disabled={isOutOfStock}
                    value={isOutOfStock ? 0 : quantity}
                    onChange={(e) => {
                      const maxStock = selectedVariant.stock || 999;
                      const val = parseInt(e.target.value, 10);
                      if (isNaN(val) || val < 1) {
                        setQuantity(1);
                      } else {
                        setQuantity(Math.min(val, maxStock));
                      }
                    }}
                    className="w-16 text-center font-bold text-slate-900 bg-white border border-slate-200 rounded-xl py-1 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                    style={{ textAlign: 'center' }}
                  />

                  <button
                    onClick={() => {
                      const maxStock = selectedVariant.stock || 999;
                      setQuantity((q) => Math.min(q + 1, maxStock));
                    }}
                    disabled={quantity >= (selectedVariant.stock || 999) || isOutOfStock}
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold shadow-2xs transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Subtotal Calculation */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-500 font-medium">Subtotal Produk:</span>
                  <div className="text-lg font-extrabold text-sky-700">
                    {formatRupiah(currentSubtotal)}
                  </div>
                </div>
                {savings > 0 && !isOutOfStock && (
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-lg">
                    Hemat {formatRupiah(savings * quantity)}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                {/* Add to Cart */}
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className="w-full py-3 px-4 rounded-2xl bg-sky-50 hover:bg-sky-100 disabled:bg-slate-100 disabled:text-slate-400 text-sky-700 font-bold text-xs flex items-center justify-center gap-2 border border-sky-200/80 transition active:scale-[0.98]"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>+ Tambah Keranjang</span>
                </button>

                {/* Buy Now */}
                <button
                  onClick={handleBuyNow}
                  disabled={isOutOfStock}
                  className="w-full py-3 px-4 rounded-2xl bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-600/25 transition active:scale-[0.98]"
                >
                  <Zap className="w-4 h-4 fill-white" />
                  <span>{isOutOfStock ? 'Stok Habis' : 'Beli Sekarang'}</span>
                </button>

                {/* Pharmacist Consultation Link */}
                <Link
                  href="/chat"
                  className="w-full py-2.5 px-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition"
                >
                  <MessageCircle className="w-4 h-4 text-sky-600" />
                  <span>Konsultasi Apoteker</span>
                </Link>
              </div>

              {/* Secure Transaction Guarantee */}
              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Jaminan 100% Produk Farmasi Asli</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span>Pengiriman Instan & Tersegel Rapat</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* ========================================================================= */}
      {/* MOBILE STICKY BOTTOM BAR (Hidden on Desktop / lg:hidden)                   */}
      {/* ========================================================================= */}
      <div className="block lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 p-3.5 shadow-2xl">
        <div className="max-w-2xl mx-auto space-y-2">
          {/* Quantity & Subtotal Row */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Jumlah:</span>
              <div className="flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-50">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || isOutOfStock}
                  className="w-6 h-6 flex items-center justify-center rounded-lg bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold shadow-2xs"
                >
                  <Minus className="w-3 h-3" />
                </button>

                {/* Manual Typing Input */}
                <input
                  type="number"
                  min="1"
                  max={selectedVariant?.stock || 999}
                  disabled={isOutOfStock}
                  value={isOutOfStock ? 0 : quantity}
                  onChange={(e) => {
                    const maxStock = selectedVariant?.stock || 999;
                    const val = parseInt(e.target.value, 10);
                    if (isNaN(val) || val < 1) {
                      setQuantity(1);
                    } else {
                      setQuantity(Math.min(val, maxStock));
                    }
                  }}
                  className="w-10 text-center font-bold text-slate-900 bg-white border border-slate-200/80 rounded-lg py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                  style={{ textAlign: 'center' }}
                />

                <button
                  onClick={() => {
                    const maxStock = selectedVariant?.stock || 999;
                    setQuantity((q) => Math.min(q + 1, maxStock));
                  }}
                  disabled={quantity >= (selectedVariant?.stock || 999) || isOutOfStock}
                  className="w-6 h-6 flex items-center justify-center rounded-lg bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold shadow-2xs"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {isOutOfStock ? (
                <span className="text-[10px] text-rose-600 font-bold">Stok Habis</span>
              ) : quantity >= (selectedVariant?.stock || 999) ? (
                <span className="text-[10px] text-amber-600 font-medium">Maks. stok</span>
              ) : null}
            </div>

            <div className="text-right">
              <div className="text-[10px] text-slate-400">Subtotal Produk</div>
              <div className="text-sm font-extrabold text-sky-700">
                {formatRupiah(currentSubtotal)}
              </div>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-2">
            {/* Pharmacist Chat Button */}
            <Link
              href="/chat"
              className="p-3 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white text-slate-700 flex flex-col items-center justify-center text-[10px] font-bold shrink-0 min-w-[54px] shadow-xs"
              aria-label="Konsultasi Apoteker"
            >
              <MessageCircle className="w-4 h-4 text-sky-600" />
              <span>Apoteker</span>
            </Link>

            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className="flex-1 py-3 px-3 rounded-2xl bg-sky-50 hover:bg-sky-100 disabled:bg-slate-100 disabled:text-slate-400 text-sky-700 font-bold text-xs flex items-center justify-center gap-1.5 border border-sky-200/70 transition active:scale-[0.98]"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>+ Keranjang</span>
            </button>

            {/* Buy Now Button */}
            <button
              onClick={handleBuyNow}
              disabled={isOutOfStock}
              className="flex-1 py-3 px-3 rounded-2xl bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-sky-600/25 transition active:scale-[0.98]"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>{isOutOfStock ? 'Stok Habis' : 'Beli Sekarang'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
