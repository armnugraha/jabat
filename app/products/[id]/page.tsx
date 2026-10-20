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
  ChevronLeft,
  Maximize2,
  X,
  Sparkles,
  Check,
  Plus,
  Minus,
  Loader2,
  MapPin,
  Clock,
  Award,
  Boxes,
  Baby,
  Brain,
} from 'lucide-react';
import { mockProducts, mockStoreSettings, mockBundlingPackages } from '@/lib/data/mock-data';
import { Product, ProductVariant, StoreSettings, BundlingPackage } from '@/lib/types';
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
  const { addItem, addBundle, itemCount } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [relatedBundles, setRelatedBundles] = useState<BundlingPackage[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'indikasi' | 'komposisi' | 'dosis' | 'perhatian'>('indikasi');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Produk berhasil masuk keranjang!');
  const [isLoading, setIsLoading] = useState(true);
  const [store, setStore] = useState<StoreSettings>(mockStoreSettings);

  // Photo Slider & Lightbox State
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [selectedBundleIds, setSelectedBundleIds] = useState<string[]>([]);

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

  // Fetch all products for dynamic complementary recommendations
  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setAllProducts(json.data);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch product detail from API
  useEffect(() => {
    setIsLoading(true);
    setActiveImageIndex(0);
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

  // Fetch active bundling packages related to this product
  useEffect(() => {
    if (!product?.id) return;
    fetch(`/api/bundling?product_id=${encodeURIComponent(product.id)}&active=true`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setRelatedBundles(json.data);
        } else {
          setRelatedBundles([]);
        }
      })
      .catch(() => {
        setRelatedBundles([]);
      });
  }, [product?.id]);

  // Computed Images List for Slider (Hook - must be before any return)
  const imageList = React.useMemo(() => {
    if (!product) return ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80'];
    const list: string[] = [];
    if (product.image_url) list.push(product.image_url);
    if (Array.isArray(product.images)) {
      product.images.forEach((img) => {
        if (img && typeof img === 'string' && !list.includes(img)) {
          list.push(img);
        }
      });
    }
    return list.length > 0 ? list : ['https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80'];
  }, [product]);

  // Dynamic Complementary / Frequently Bought Together Algorithm (Hook - must be before any return)
  const frequentlyBoughtTogether = React.useMemo(() => {
    if (!product) return [];
    const sourceList = allProducts.length > 0 ? allProducts : mockProducts;
    const candidates = sourceList.filter((p) => p.id !== product.id && p.slug !== product.slug);

    const scored = candidates.map((p) => {
      let score = 0;
      // 1. Same category bonus
      if (p.category_id && p.category_id === product.category_id) score += 10;

      // 2. Complementary categories (Vitamins/Supplements, First Aid, OTC)
      const catName = (p.category?.name || '').toLowerCase();
      if (catName.includes('vitamin') || catName.includes('suplemen')) score += 8;
      if (catName.includes('alat') || catName.includes('perawatan')) score += 5;

      // 3. Stock availability & popularity bonus
      const hasStock = p.variants?.some((v) => (v.stock || 0) > 0);
      if (hasStock) score += 4;
      if (p.is_featured) score += 2;

      return { product: p, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 2).map((s) => s.product);
  }, [product, allProducts]);

  // Keep bundle items selected by default (Hook - must be before any return)
  useEffect(() => {
    if (frequentlyBoughtTogether.length > 0) {
      setSelectedBundleIds(frequentlyBoughtTogether.map((p) => p.id));
    }
  }, [frequentlyBoughtTogether]);

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

  const currentImageIndex = Math.min(activeImageIndex, Math.max(0, imageList.length - 1));

  const handlePrevImage = () => {
    setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : imageList.length - 1));
  };

  const handleNextImage = () => {
    setActiveImageIndex((prev) => (prev < imageList.length - 1 ? prev + 1 : 0));
  };

  const toggleBundleItem = (bundleItemId: string) => {
    setSelectedBundleIds((prev) =>
      prev.includes(bundleItemId) ? prev.filter((i) => i !== bundleItemId) : [...prev, bundleItemId]
    );
  };

  const selectedBundleItems = frequentlyBoughtTogether.filter((p) =>
    selectedBundleIds.includes(p.id)
  );

  const bundleTotal =
    (selectedVariant ? selectedVariant.price * quantity : 0) +
    selectedBundleItems.reduce(
      (sum, item) => sum + (item.variants?.[0]?.price || 0),
      0
    );

  const handleBuyBundle = () => {
    if (!product || !selectedVariant) return;

    // 1. Add current main product
    addItem(product, selectedVariant, quantity);

    // 2. Add each selected companion product
    selectedBundleItems.forEach((item) => {
      const defaultVariant = item.variants?.[0];
      if (defaultVariant) {
        addItem(item, defaultVariant, 1);
      }
    });

    setToastMessage(`Paket hemat (${selectedBundleItems.length + 1} produk) berhasil masuk keranjang!`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

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
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-rose-600 transition border border-slate-200/80 bg-white shadow-2xs"
              aria-label="Favorit"
            >
              <Heart
                className={`w-4 h-4 transition ${
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
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition border border-slate-200/80 bg-white shadow-2xs"
              aria-label="Bagikan"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <Link
              href="/cart"
              className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-100 transition border border-slate-200/80 bg-white shadow-2xs"
              aria-label="Keranjang Belanja"
            >
              <ShoppingBag className="w-4 h-4 text-sky-600" />
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-sky-600 text-white text-[10px] font-extrabold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-xs ring-2 ring-white leading-none">
                  {itemCount > 99 ? '99+' : itemCount}
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

              {/* Interactive Product Image Slider */}
              <div className="relative group">
                <div
                  className="w-full aspect-[4/3] lg:aspect-square bg-slate-50 rounded-2xl flex items-center justify-center p-4 relative overflow-hidden border border-slate-100 select-none cursor-zoom-in"
                  onClick={() => setIsLightboxOpen(true)}
                  onTouchStart={(e) => setTouchStartX(e.touches[0].clientX)}
                  onTouchEnd={(e) => {
                    if (touchStartX === null) return;
                    const diff = touchStartX - e.changedTouches[0].clientX;
                    if (diff > 40) handleNextImage();
                    else if (diff < -40) handlePrevImage();
                    setTouchStartX(null);
                  }}
                >
                  <img
                    key={imageList[currentImageIndex]}
                    src={imageList[currentImageIndex]}
                    alt={`${product.name} - Foto ${currentImageIndex + 1}`}
                    className="w-full h-full object-contain mix-blend-multiply transition-all duration-300 hover:scale-105"
                  />

                  {/* Floating Zoom Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsLightboxOpen(true);
                    }}
                    className="absolute top-3 right-3 p-2 rounded-xl bg-white/90 backdrop-blur-xs text-slate-700 shadow-sm border border-slate-200/80 hover:bg-white hover:text-sky-600 transition"
                    title="Perbesar Foto Kemasan & Etiket"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>

                  {/* Floating Previous & Next Buttons */}
                  {imageList.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrevImage();
                        }}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs text-slate-700 shadow-md border border-slate-200/80 flex items-center justify-center hover:bg-white hover:text-sky-600 transition active:scale-90"
                        aria-label="Foto Sebelumnya"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNextImage();
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-xs text-slate-700 shadow-md border border-slate-200/80 flex items-center justify-center hover:bg-white hover:text-sky-600 transition active:scale-90"
                        aria-label="Foto Berikutnya"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}

                  {/* Floating Photo Counter Badge */}
                  <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-lg bg-slate-900/70 backdrop-blur-xs text-white text-[10px] font-bold">
                    {currentImageIndex + 1} / {imageList.length} Foto
                  </div>
                </div>

                {/* Thumbnails Row if Multiple Images */}
                {imageList.length > 1 && (
                  <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-1 scrollbar-none">
                    {imageList.map((imgUrl, idx) => {
                      const isActive = idx === currentImageIndex;
                      return (
                        <button
                          key={imgUrl + idx}
                          type="button"
                          onClick={() => setActiveImageIndex(idx)}
                          className={`w-14 h-14 rounded-xl border-2 p-1 bg-white shrink-0 overflow-hidden transition cursor-pointer ${
                            isActive
                              ? 'border-sky-600 ring-2 ring-sky-500/20'
                              : 'border-slate-200 hover:border-slate-300 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={imgUrl}
                            alt={`Thumbnail ${idx + 1}`}
                            className="w-full h-full object-contain mix-blend-multiply"
                          />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Interactive Dynamic Pagination Dots */}
                {imageList.length > 1 && (
                  <div className="flex items-center justify-center gap-1.5 mt-2.5">
                    {imageList.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveImageIndex(idx)}
                        className={`transition-all duration-200 cursor-pointer ${
                          idx === currentImageIndex
                            ? 'w-5 h-1.5 rounded-full bg-sky-600'
                            : 'w-1.5 h-1.5 rounded-full bg-slate-300 hover:bg-slate-400'
                        }`}
                        aria-label={`Pindah ke foto ${idx + 1}`}
                      />
                    ))}
                  </div>
                )}
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

            {/* Paket Bundling Terkait (Ibu Hamil, Ibu Menyusui, Kesehatan Otak, dll) */}
            {relatedBundles.length > 0 && (
              <div className="bg-gradient-to-br from-sky-50/80 via-white to-blue-50/50 rounded-3xl border border-sky-200/80 p-4 sm:p-5 shadow-stitch space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
                      <Boxes className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                        Tersedia Dalam Paket Bundling Hemat
                      </h3>
                      <p className="text-[10px] sm:text-xs text-slate-500">
                        Produk ini tersedia dalam paket lengkap dengan harga diskon khusus
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/bundles"
                    className="text-[11px] font-bold text-sky-600 hover:text-sky-700 hidden sm:inline-flex items-center gap-0.5"
                  >
                    <span>Lihat Semua Paket</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="space-y-3">
                  {relatedBundles.map((b) => (
                    <div
                      key={b.id}
                      className="bg-white rounded-2xl border border-sky-100 p-4 space-y-3 shadow-2xs hover:border-sky-300 transition"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-100 text-sky-800">
                          {b.category}
                        </span>
                        {b.badge && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                            {b.badge}
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                          {b.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                          {b.description}
                        </p>
                      </div>

                      {/* Items row */}
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                        {b.items.map((it, idx) => (
                          <React.Fragment key={it.id || idx}>
                            <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-100 shrink-0">
                              <span className="text-[9px] font-black bg-sky-600 text-white rounded px-1 py-0.2">
                                {it.quantity}x
                              </span>
                              <span className="text-[11px] font-semibold text-slate-800 max-w-[120px] truncate">
                                {it.product?.name || it.product_id}
                              </span>
                            </div>
                            {idx < b.items.length - 1 && (
                              <Plus className="w-3 h-3 text-slate-400 shrink-0" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>

                      {/* Pricing & Button */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                        {(() => {
                          const itemsSum = (b.items || []).reduce(
                            (sum, it) => sum + (Number(it.variant?.price) || 0) * (Number(it.quantity) || 1),
                            0
                          );
                          const origPrice =
                            Number(b.original_price) > 0 && Number(b.original_price) >= Number(b.bundle_price)
                              ? Number(b.original_price)
                              : itemsSum > 0
                              ? itemsSum
                              : Number(b.bundle_price);
                          const bPrice = Number(b.bundle_price) || 0;
                          const savAmount = Math.max(0, origPrice - bPrice);
                          const savPct = origPrice > 0 ? Math.round((savAmount / origPrice) * 100) : 0;

                          return (
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-slate-400 line-through">
                                  {formatRupiah(origPrice)}
                                </span>
                                <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                                  Hemat {savPct}%
                                </span>
                              </div>
                              <div className="text-xs sm:text-sm font-black text-slate-900">
                                {formatRupiah(bPrice)}
                              </div>
                            </div>
                          );
                        })()}

                        <button
                          onClick={() => {
                            addBundle(b);
                            setToastMessage(`Paket "${b.name}" berhasil masuk keranjang!`);
                            setShowToast(true);
                            setTimeout(() => setShowToast(false), 2500);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-[0.98] text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>Beli Paket Ini</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Frequently Bought Together / Rekomendasi Terapi Pelengkap */}
            {frequentlyBoughtTogether.length > 0 && (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-stitch space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <h3 className="text-xs sm:text-sm font-extrabold text-slate-900">
                        Sering Dibeli Bersamaan
                      </h3>
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                      Kombinasi terapi & suplemen yang saling melengkapi
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100 hidden sm:inline-block">
                    Rekomendasi Apoteker
                  </span>
                </div>

                {/* Candidate Companion Items */}
                <div className="space-y-2.5">
                  {frequentlyBoughtTogether.map((item) => {
                    const isSelected = selectedBundleIds.includes(item.id);
                    const defaultVariant = item.variants?.[0];
                    const itemPrice = defaultVariant?.price || 0;
                    const inStock = (defaultVariant?.stock || 0) > 0;

                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleBundleItem(item.id)}
                        className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'border-sky-300 bg-sky-50/40'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Checkbox */}
                          <div
                            className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition ${
                              isSelected
                                ? 'bg-sky-600 border-sky-600 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>

                          {/* Image */}
                          <div className="w-12 h-12 bg-white rounded-xl border border-slate-100 overflow-hidden shrink-0 p-1">
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-contain mix-blend-multiply"
                            />
                          </div>

                          {/* Detail */}
                          <div className="min-w-0">
                            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider block">
                              {item.category?.name || item.manufacturer || 'Pelengkap'}
                            </span>
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {item.name}
                            </h4>
                            <div className="text-xs font-extrabold text-sky-700 mt-0.5">
                              {formatRupiah(itemPrice)}
                            </div>
                          </div>
                        </div>

                        {/* View Product Link */}
                        <Link
                          href={`/products/${item.slug || item.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] text-slate-400 hover:text-sky-600 p-1 shrink-0"
                          title="Lihat detail"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Link>
                      </div>
                    );
                  })}
                </div>

                {/* Bundle Buy Action */}
                <div className="mt-2 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70 p-3 rounded-2xl">
                  <div>
                    <div className="text-[10px] text-slate-500">
                      Total Paket ({selectedBundleItems.length + 1} Produk):
                    </div>
                    <div className="text-sm font-black text-slate-900">
                      {formatRupiah(bundleTotal)}
                    </div>
                  </div>

                  <button
                    onClick={handleBuyBundle}
                    disabled={isOutOfStock || selectedBundleItems.length === 0}
                    className="py-2 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-[0.98]"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Beli Paket Bersama</span>
                  </button>
                </div>
              </div>
            )}
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

      {/* Fullscreen Photo Lightbox Modal */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setIsLightboxOpen(false)}
        >
          {/* Close button */}
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur transition"
            aria-label="Tutup"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Indicator */}
          <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full bg-black/50 text-white text-xs font-semibold backdrop-blur border border-white/10">
            {currentImageIndex + 1} / {imageList.length}
          </div>

          {/* Main Zoomed Image */}
          <div
            className="relative max-w-4xl max-h-[85vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imageList[currentImageIndex]}
              alt={product.name}
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />

            {/* Slider arrows in lightbox */}
            {imageList.length > 1 && (
              <>
                <button
                  onClick={handlePrevImage}
                  className="absolute left-2 sm:-left-12 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur transition"
                  aria-label="Foto Sebelumnya"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={handleNextImage}
                  className="absolute right-2 sm:-right-12 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur transition"
                  aria-label="Foto Berikutnya"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

