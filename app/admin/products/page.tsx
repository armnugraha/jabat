'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Package,
  Plus,
  Search,
  SlidersHorizontal,
  Edit,
  Trash2,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
} from 'lucide-react';
import { mockProducts } from '@/lib/data/mock-data';
import { formatRupiah } from '@/lib/utils';
import { Product } from '@/lib/types';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch products from API
  const loadProducts = () => {
    setIsLoading(true);
    fetch('/api/products')
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
    return matchQuery && matchCategory;
  });

  const toggleActive = (id: string) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_active: !p.is_active } : p))
    );
  };

  const deleteProduct = async (id: string) => {
    if (confirm('Yakin ingin menghapus produk obat ini dari sistem?')) {
      try {
        await fetch(`/api/products/${id}`, { method: 'DELETE' });
        setProducts((prev) => prev.filter((p) => p.id !== id));
      } catch (err) {
        console.error('Failed deleting product:', err);
        setProducts((prev) => prev.filter((p) => p.id !== id));
      }
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
                <th className="py-3.5 px-4">Varian Kemasan & Harga</th>
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
                    <div className="space-y-1">
                      {p.variants.map((v) => (
                        <div
                          key={v.id}
                          className="flex items-center gap-2 text-[11px]"
                        >
                          <span className="font-bold text-slate-800">
                            {v.name} ({v.quantity_per_package} {v.unit}):
                          </span>
                          <span className="font-extrabold text-sky-700">
                            {formatRupiah(v.price)}
                          </span>
                          <span className="text-slate-400">
                            (Stok: {v.stock})
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => toggleActive(p.id)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition ${
                        p.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {p.is_active ? '● Aktif' : '○ Nonaktif'}
                    </button>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
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

            <div className="pt-2 border-t border-slate-100 space-y-1">
              {p.variants.map((v) => (
                <div key={v.id} className="flex justify-between text-xs">
                  <span className="font-semibold text-slate-700">
                    {v.name} ({v.quantity_per_package} {v.unit})
                  </span>
                  <div className="text-right">
                    <span className="font-extrabold text-sky-700">
                      {formatRupiah(v.price)}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-1">
                      (Stok {v.stock})
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => toggleActive(p.id)}
                className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                  p.is_active
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {p.is_active ? 'Aktif' : 'Nonaktif'}
              </button>

              <div className="flex items-center gap-2">
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
    </div>
  );
}
