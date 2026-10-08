'use client';

import React, { useState, useEffect } from 'react';
import { FolderTree, Plus, Edit, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import { mockCategories } from '@/lib/data/mock-data';
import { Category } from '@/lib/types';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCategories = () => {
    setIsLoading(true);
    fetch('/api/categories')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setCategories(json.data);
        }
      })
      .catch((err) => console.error('Failed fetching categories:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCatName.trim(),
          description: newCatDesc.trim() || 'Kategori Farmasi',
          icon: 'pill',
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setCategories((prev) => [...prev, json.data]);
        setNewCatName('');
        setNewCatDesc('');
      }
    } catch (err) {
      console.error('Failed creating category:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteCategory = (id: string) => {
    if (confirm('Hapus kategori ini?')) {
      setCategories((prev) => prev.filter((c) => c.id !== id));
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div>
        <h2 className="text-lg font-extrabold text-slate-900">
          Kategori Obat & Produk
        </h2>
        <p className="text-xs text-slate-500">
          Kelola pengelompokan sediaan obat, vitamin, dan alat kesehatan
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Add Category Form */}
        <form
          onSubmit={handleAddCategory}
          className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-stitch space-y-4 h-fit"
        >
          <h3 className="text-xs font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Plus className="w-4 h-4 text-sky-600" />
            <span>Tambah Kategori Baru</span>
          </h3>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Nama Kategori *
            </label>
            <input
              type="text"
              required
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Contoh: Obat Batuk & Flu"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Deskripsi Singkat
            </label>
            <input
              type="text"
              value={newCatDesc}
              onChange={(e) => setNewCatDesc(e.target.value)}
              placeholder="Contoh: Sediaan sirup & kaplet pereda batuk"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition"
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan Kategori'}
          </button>
        </form>

        {/* Categories List */}
        <div className="md:col-span-2 bg-white rounded-3xl border border-slate-200/80 p-5 shadow-stitch space-y-3">
          <h3 className="text-xs font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center justify-between">
            <span>Daftar Kategori Aktif</span>
            <span className="text-xs text-slate-400">
              {categories.length} Kategori
            </span>
          </h3>

          {isLoading ? (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
              <span className="text-xs text-slate-400">Memuat kategori...</span>
            </div>
          ) : (
            <div className="space-y-2">
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{c.name}</h4>
                    <p className="text-[11px] text-slate-500">{c.description}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                      Aktif
                    </span>
                    <button
                      onClick={() => deleteCategory(c.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
