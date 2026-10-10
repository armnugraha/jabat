'use client';

import React, { useState, useEffect } from 'react';
import { FolderTree, Plus, Trash2, CheckCircle2, Loader2, Pill, Sparkles, Activity, Heart, Stethoscope, Tag, AlertCircle } from 'lucide-react';
import { mockCategories } from '@/lib/data/mock-data';
import { Category } from '@/lib/types';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('pill');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
    setFeedback(null);

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCatName.trim(),
          description: newCatDesc.trim() || 'Kategori Farmasi',
          icon: newCatIcon,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setCategories((prev) => [...prev, json.data]);
        setNewCatName('');
        setNewCatDesc('');
        setFeedback({ type: 'success', message: 'Kategori baru berhasil ditambahkan!' });
        loadCategories();
      } else {
        setFeedback({ type: 'error', message: json.error || 'Gagal menambahkan kategori.' });
      }
    } catch (err: any) {
      console.error('Failed creating category:', err);
      setFeedback({ type: 'error', message: err?.message || 'Terjadi kesalahan jaringan.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteCategory = async (id: string) => {
    if (confirm('Yakin ingin menghapus kategori ini dari sistem?')) {
      try {
        await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
        setCategories((prev) => prev.filter((c) => c.id !== id));
        setFeedback({ type: 'success', message: 'Kategori berhasil dihapus.' });
      } catch (err) {
        console.error('Failed deleting category:', err);
        setCategories((prev) => prev.filter((c) => c.id !== id));
      }
    }
  };

  const iconsList = [
    { id: 'pill', label: 'Obat', Icon: Pill },
    { id: 'sparkles', label: 'Perawatan', Icon: Sparkles },
    { id: 'activity', label: 'Vitamin', Icon: Activity },
    { id: 'heart', label: 'Ibu & Anak', Icon: Heart },
    { id: 'stethoscope', label: 'Alkes', Icon: Stethoscope },
    { id: 'tag', label: 'Promo', Icon: Tag },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div>
        <h2 className="text-lg font-extrabold text-slate-900">
          Kategori Obat & Produk
        </h2>
        <p className="text-xs text-slate-500">
          Kelola pengelompokan sediaan obat, vitamin, dan alat kesehatan farmasi
        </p>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

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
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500 font-medium"
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

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Pilih Ikon Kategori
            </label>
            <div className="grid grid-cols-3 gap-2">
              {iconsList.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setNewCatIcon(id)}
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 text-[10px] font-bold transition ${
                    newCatIcon === id
                      ? 'border-sky-600 bg-sky-50 text-sky-700 shadow-2xs'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="truncate w-full text-center">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Kategori'}</span>
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
                  className="p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex items-center justify-between transition"
                >
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{c.name}</h4>
                    <p className="text-[11px] text-slate-500">{c.description}</p>
                    <span className="text-[9px] text-slate-400 font-mono">slug: {c.slug}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                      Aktif
                    </span>
                    <button
                      onClick={() => deleteCategory(c.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                      title="Hapus Kategori"
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
