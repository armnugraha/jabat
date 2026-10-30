'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Package,
  Plus,
  Minus,
  Search,
  SlidersHorizontal,
  Edit,
  Trash2,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
  Boxes,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import { mockProducts } from '@/lib/data/mock-data';
import { formatRupiah } from '@/lib/utils';
import { Product, ProductVariant } from '@/lib/types';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [togglingProductId, setTogglingProductId] = useState<string | null>(null);

  // Stock management states
  const [updatingVariantId, setUpdatingVariantId] = useState<string | null>(null);
  const [stockModalProduct, setStockModalProduct] = useState<Product | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [stockInputValue, setStockInputValue] = useState<string>('0');
  const [isSavingStock, setIsSavingStock] = useState<boolean>(false);
  const [stockSuccessMessage, setStockSuccessMessage] = useState<string | null>(null);

  // Fetch products from API (load all including inactive for admin management)
  const loadProducts = () => {
    setIsLoading(true);
    fetch('/api/products?all=true')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setProducts(json.data);
        }
      })
      .catch((err) => console.error('Failed fetching admin products:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = products.filter((p) => {
    const matchQuery =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory =
      selectedCategory === 'all' || p.category_id === selectedCategory;
    const matchStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'active' ? p.is_active !== false : p.is_active === false);
    return matchQuery && matchCategory && matchStatus;
  });

  const toggleActive = async (id: string) => {
    const targetProduct = products.find((p) => p.id === id);
    if (!targetProduct) return;
    const nextStatus = targetProduct.is_active === false ? true : false;

    // Optimistic UI update
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_active: nextStatus } : p))
    );
    setTogglingProductId(id);

    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: nextStatus }),
      });
      const json = await res.json();
      if (!json.success) {
        // Revert on failure
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, is_active: !nextStatus } : p))
        );
        alert(json.error || 'Gagal mengubah status aktif produk');
      }
    } catch (err) {
      console.error('Failed toggling product active status:', err);
      // Revert on failure
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, is_active: !nextStatus } : p))
      );
      alert('Terjadi kesalahan jaringan saat mengubah status produk.');
    } finally {
      setTogglingProductId(null);
    }
  };

  const deleteProduct = async (id: string) => {
    if (confirm('Yakin ingin menghapus produk obat ini dari sistem?')) {
      try {
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          setProducts((prev) => prev.filter((p) => p.id !== id));
        } else {
          alert(json.error || 'Gagal menghapus produk obat');
        }
      } catch (err) {
        console.error('Failed deleting product:', err);
        alert('Gagal menghubungi server untuk menghapus produk obat');
      }
    }
  };

  // Quick adjust stock via PATCH API
  const handleAdjustStock = async (
    productId: string,
    variantId: string,
    options: { delta?: number; newStock?: number }
  ) => {
    const product = products.find((p) => p.id === productId);
    const variant = product?.variants.find((v) => v.id === variantId);
    if (!product || !variant) return;

    const currentStock = variant.stock ?? 0;
    let targetStock = currentStock;

    if (options.newStock !== undefined) {
      targetStock = Math.max(0, options.newStock);
    } else if (options.delta !== undefined) {
      targetStock = Math.max(0, currentStock + options.delta);
    }

    if (targetStock === currentStock && options.delta !== undefined && options.delta < 0) {
      return; // Already 0, cannot reduce further
    }

    // Optimistic UI update
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        return {
          ...p,
          variants: p.variants.map((v) =>
            v.id === variantId ? { ...v, stock: targetStock } : v
          ),
        };
      })
    );

    // If stock modal is currently open for this variant, sync input value
    if (stockModalProduct?.id === productId && selectedVariantId === variantId) {
      setStockInputValue(String(targetStock));
    }

    setUpdatingVariantId(variantId);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId,
          delta: options.delta,
          stock: options.newStock,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        // Synchronize with server response
        setProducts((prev) =>
          prev.map((p) => (p.id === productId ? json.data : p))
        );
        if (stockModalProduct?.id === productId) {
          setStockModalProduct(json.data);
        }
      }
    } catch (err) {
      console.error('Failed updating variant stock:', err);
    } finally {
      setUpdatingVariantId(null);
    }
  };

  // Open modal for detailed stock management
  const openStockModal = (product: Product, variantId?: string) => {
    const activeVarId = variantId || product.variants[0]?.id || null;
    const initialVariant = product.variants.find((v) => v.id === activeVarId) || product.variants[0];
    setStockModalProduct(product);
    setSelectedVariantId(activeVarId);
    setStockInputValue(String(initialVariant?.stock ?? 0));
    setStockSuccessMessage(null);
  };

  const handleSelectModalVariant = (variantId: string) => {
    setSelectedVariantId(variantId);
    if (!stockModalProduct) return;
    const variant = stockModalProduct.variants.find((v) => v.id === variantId);
    setStockInputValue(String(variant?.stock ?? 0));
    setStockSuccessMessage(null);
  };

  const handleSaveModalStock = async () => {
    if (!stockModalProduct || !selectedVariantId) return;
    const parsed = parseInt(stockInputValue, 10);
    const newStock = isNaN(parsed) ? 0 : Math.max(0, parsed);

    setIsSavingStock(true);
    setStockSuccessMessage(null);
    try {
      await handleAdjustStock(stockModalProduct.id, selectedVariantId, { newStock });
      setStockSuccessMessage('Stok berhasil diperbarui!');
      setTimeout(() => {
        setStockSuccessMessage(null);
      }, 2500);
    } finally {
      setIsSavingStock(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header with Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">
            Katalog Obat & Satuan Kemasan
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola inventaris obat, aturan resep dokter, harga varian kemasan, dan ketersediaan stok
          </p>
        </div>

        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-600/25 transition active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Obat Baru</span>
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-stitch flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama obat, kandungan aktif, nomor BPOM..."
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-3 text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="all">Semua Kategori</option>
            <option value="c1">Obat Bebas</option>
            <option value="c2">Perawatan Diri</option>
            <option value="c3">Vitamin & Suplemen</option>
            <option value="c4">Ibu & Anak</option>
            <option value="c5">Alat Kesehatan</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="w-full sm:w-auto bg-slate-50 border border-slate-200 rounded-2xl py-2.5 px-3 text-xs font-semibold text-slate-700 focus:outline-none"
          >
            <option value="all">Semua Status</option>
            <option value="active">● Hanya Aktif</option>
            <option value="inactive">○ Hanya Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Desktop Table View */}
      {isLoading ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
          <span className="text-xs text-slate-500 font-medium">Memuat katalog obat...</span>
        </div>
      ) : (
        <div className="hidden md:block bg-white rounded-3xl border border-slate-200/80 shadow-stitch overflow-hidden">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Nama Produk & BPOM</th>
                <th className="py-3.5 px-4">Tipe Obat</th>
                <th className="py-3.5 px-4 min-w-[280px]">Varian Kemasan & Kontrol Stok</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={p.image_url}
                        alt={p.name}
                        className="w-12 h-12 rounded-xl object-contain bg-slate-50 border border-slate-200 p-1 shrink-0"
                      />
                      <div>
                        <div className="font-bold text-slate-900 line-clamp-1">
                          {p.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          BPOM: {p.bpom_number || 'DBL8504104210A1'}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    {p.requires_prescription ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                        Wajib Resep
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Obat Bebas
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="space-y-1.5">
                      {p.variants.map((v) => {
                        const isUpdating = updatingVariantId === v.id;
                        const isOutOfStock = v.stock <= 0;
                        const isLowStock = v.stock > 0 && v.stock <= 5;

                        return (
                          <div
                            key={v.id}
                            className="flex items-center justify-between gap-2.5 p-1.5 px-2.5 rounded-xl bg-slate-50/90 border border-slate-200/70 hover:border-slate-300 transition"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="font-bold text-slate-800 text-[11px] truncate">
                                {v.name}{' '}
                                <span className="text-[10px] text-slate-500 font-normal">
                                  ({v.quantity_per_package} {v.unit})
                                </span>
                              </div>
                              <div className="font-extrabold text-sky-700 text-[11px]">
                                {formatRupiah(v.price)}
                              </div>
                            </div>

                            {/* Stock Quick Controls */}
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleAdjustStock(p.id, v.id, { delta: -1 })}
                                disabled={isOutOfStock || isUpdating}
                                className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed text-xs transition active:scale-95 shadow-2xs"
                                title="Kurangi Stok ( -1 )"
                              >
                                <Minus className="w-3 h-3" />
                              </button>

                              <button
                                type="button"
                                onClick={() => openStockModal(p, v.id)}
                                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border transition hover:ring-2 hover:ring-sky-400/20 flex items-center gap-1 ${
                                  isOutOfStock
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : isLowStock
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                }`}
                                title="Klik untuk atur stok manual"
                              >
                                {isUpdating && (
                                  <Loader2 className="w-2.5 h-2.5 animate-spin text-sky-600" />
                                )}
                                <span>{v.stock}</span>
                                {isOutOfStock && (
                                  <span className="text-[9px] font-semibold text-rose-500">
                                    (Habis)
                                  </span>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleAdjustStock(p.id, v.id, { delta: 1 })}
                                disabled={isUpdating}
                                className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 hover:border-slate-300 disabled:opacity-30 text-xs transition active:scale-95 shadow-2xs"
                                title="Tambah Stok ( +1 )"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      onClick={() => toggleActive(p.id)}
                      disabled={togglingProductId === p.id}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition inline-flex items-center gap-1 mx-auto ${
                        p.is_active !== false
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                      } disabled:opacity-50`}
                      title={p.is_active !== false ? 'Klik untuk menonaktifkan produk' : 'Klik untuk mengaktifkan produk'}
                    >
                      {togglingProductId === p.id ? (
                        <Loader2 className="w-3 h-3 animate-spin text-slate-500" />
                      ) : (
                        <span>{p.is_active !== false ? '● Aktif' : '○ Nonaktif'}</span>
                      )}
                    </button>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openStockModal(p)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition"
                        title="Kelola & Atur Stok"
                      >
                        <Boxes className="w-4 h-4" />
                      </button>
                      <Link
                        href={`/admin/products/${p.id}/edit`}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                        title="Edit Obat & Kemasan"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <Link
                        href={`/products/${p.slug || p.id}`}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-sky-600 hover:bg-sky-50"
                        title="Lihat Halaman Produk"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => deleteProduct(p.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                        title="Hapus Obat"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {filteredProducts.map((p) => (
          <div
            key={p.id}
            className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-stitch space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <img
                  src={p.image_url}
                  alt={p.name}
                  className="w-14 h-14 rounded-xl object-contain bg-slate-50 border border-slate-200 p-1 shrink-0"
                />
                <div>
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                    {p.name}
                  </h4>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    BPOM: {p.bpom_number || 'DBL8504104210A1'}
                  </div>
                  <div className="mt-1">
                    {p.requires_prescription ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[9px] font-bold">
                        Wajib Resep
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold">
                        Obat Bebas
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              {p.variants.map((v) => {
                const isUpdating = updatingVariantId === v.id;
                const isOutOfStock = v.stock <= 0;
                const isLowStock = v.stock > 0 && v.stock <= 5;

                return (
                  <div
                    key={v.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-slate-50 border border-slate-200/70"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-800 text-xs truncate">
                        {v.name} ({v.quantity_per_package} {v.unit})
                      </div>
                      <div className="font-extrabold text-sky-700 text-xs mt-0.5">
                        {formatRupiah(v.price)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleAdjustStock(p.id, v.id, { delta: -1 })}
                        disabled={isOutOfStock || isUpdating}
                        className="w-7 h-7 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition active:scale-95 shadow-2xs"
                        title="Kurang 1 Stok"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => openStockModal(p, v.id)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition flex items-center gap-1 ${
                          isOutOfStock
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : isLowStock
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        }`}
                        title="Klik untuk ubah stok manual"
                      >
                        {isUpdating && <Loader2 className="w-3 h-3 animate-spin text-sky-600" />}
                        <span>Stok: {v.stock}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAdjustStock(p.id, v.id, { delta: 1 })}
                        disabled={isUpdating}
                        className="w-7 h-7 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-30 transition active:scale-95 shadow-2xs"
                        title="Tambah 1 Stok"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => toggleActive(p.id)}
                disabled={togglingProductId === p.id}
                className={`px-3 py-1 rounded-xl text-xs font-bold border transition inline-flex items-center gap-1.5 ${
                  p.is_active !== false
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                } disabled:opacity-50`}
              >
                {togglingProductId === p.id && (
                  <Loader2 className="w-3 h-3 animate-spin text-slate-500" />
                )}
                <span>{p.is_active !== false ? '● Aktif' : '○ Nonaktif'}</span>
              </button>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openStockModal(p)}
                  className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-xl flex items-center gap-1 text-xs font-bold"
                  title="Kelola Stok"
                >
                  <Boxes className="w-4 h-4" />
                  <span>Stok</span>
                </button>
                <Link
                  href={`/admin/products/${p.id}/edit`}
                  className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-xl"
                  title="Edit Obat"
                >
                  <Edit className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => deleteProduct(p.id)}
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stock Management Modal */}
      {stockModalProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <img
                  src={stockModalProduct.image_url}
                  alt={stockModalProduct.name}
                  className="w-12 h-12 rounded-xl object-contain bg-white border border-slate-200 p-1 shrink-0 shadow-2xs"
                />
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 line-clamp-1">
                    {stockModalProduct.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    BPOM: {stockModalProduct.bpom_number || 'DBL8504104210A1'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStockModalProduct(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Variant selector tabs if multiple */}
              {stockModalProduct.variants.length > 1 && (
                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    Pilih Kemasan / Varian
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {stockModalProduct.variants.map((v) => {
                      const isSelected = v.id === selectedVariantId;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => handleSelectModalVariant(v.id)}
                          className={`p-2.5 rounded-2xl text-left border transition text-xs font-semibold ${
                            isSelected
                              ? 'border-sky-600 bg-sky-50/70 text-sky-950 shadow-2xs'
                              : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50'
                          }`}
                        >
                          <div className="font-bold">{v.name}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Stok: <span className="font-extrabold text-slate-800">{v.stock}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Selected Variant Detail */}
              {(() => {
                const activeVar =
                  stockModalProduct.variants.find((v) => v.id === selectedVariantId) ||
                  stockModalProduct.variants[0];
                if (!activeVar) return null;

                return (
                  <div className="space-y-4">
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800">
                          {activeVar.name} ({activeVar.quantity_per_package} {activeVar.unit})
                        </span>
                        <div className="text-[11px] font-extrabold text-sky-700 mt-0.5">
                          {formatRupiah(activeVar.price)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400 font-medium">Stok Saat Ini</div>
                        <div className="text-sm font-extrabold text-slate-900">{activeVar.stock} unit</div>
                      </div>
                    </div>

                    {/* Input for exact stock */}
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1.5">
                        Atur Jumlah Stok Baru:
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const cur = parseInt(stockInputValue, 10) || 0;
                            setStockInputValue(String(Math.max(0, cur - 1)));
                          }}
                          className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-700 font-bold active:scale-95 transition"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={stockInputValue}
                          onChange={(e) => setStockInputValue(e.target.value)}
                          className="flex-1 bg-slate-50 border border-slate-300 rounded-2xl py-2 px-3 text-center text-base font-extrabold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const cur = parseInt(stockInputValue, 10) || 0;
                            setStockInputValue(String(cur + 1));
                          }}
                          className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 flex items-center justify-center text-slate-700 font-bold active:scale-95 transition"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Quick shortcut pills */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Tombol Cepat Tambah / Kurang
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: '+5', delta: 5 },
                          { label: '+10', delta: 10 },
                          { label: '+25', delta: 25 },
                          { label: '+50', delta: 50 },
                          { label: '+100', delta: 100 },
                          { label: '-5', delta: -5 },
                          { label: '-10', delta: -10 },
                        ].map((btn) => (
                          <button
                            key={btn.label}
                            type="button"
                            onClick={() => {
                              const cur = parseInt(stockInputValue, 10) || 0;
                              setStockInputValue(String(Math.max(0, cur + btn.delta)));
                            }}
                            className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition active:scale-95 border border-slate-200/80"
                          >
                            {btn.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setStockInputValue('0')}
                          className="px-2.5 py-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition active:scale-95 border border-rose-200"
                        >
                          Set 0 (Habis)
                        </button>
                      </div>
                    </div>

                    {stockSuccessMessage && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{stockSuccessMessage}</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setStockModalProduct(null)}
                className="px-4 py-2 rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleSaveModalStock}
                disabled={isSavingStock}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-2xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition active:scale-95"
              >
                {isSavingStock ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>Simpan Stok</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
