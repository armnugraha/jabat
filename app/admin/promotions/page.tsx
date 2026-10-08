'use client';

import React, { useState, useEffect } from 'react';
import { Tag, Plus, Trash2, CheckCircle2, Ticket, Loader2 } from 'lucide-react';
import { Promotion } from '@/lib/types';
import { formatRupiah } from '@/lib/utils';

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [discountValue, setDiscountValue] = useState(10000);
  const [minOrder, setMinOrder] = useState(50000);

  const fetchPromotions = () => {
    setIsLoading(true);
    fetch('/api/promotions')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setPromotions(json.data);
        }
      })
      .catch((err) => console.error('Failed to fetch promotions:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  const handleAddPromotion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setIsSubmitting(true);
    const newPromo = {
      code: code.trim().toUpperCase(),
      title: title.trim() || `Voucher ${code.trim().toUpperCase()}`,
      description: `Potongan ${formatRupiah(discountValue)} minimal belanja ${formatRupiah(minOrder)}`,
      discount_type: 'fixed',
      discount_value: Number(discountValue),
      min_order_amount: Number(minOrder),
    };

    try {
      const res = await fetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPromo),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setPromotions((prev) => [json.data, ...prev]);
        setCode('');
        setTitle('');
      }
    } catch (err) {
      console.error('Failed to create promotion:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div>
        <h2 className="text-lg font-extrabold text-slate-900">
          Promo & Voucher Farmasi
        </h2>
        <p className="text-xs text-slate-500">
          Atur kode diskon dan voucher dari database Supabase untuk pelanggan apotek
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Create Voucher Form */}
        <form
          onSubmit={handleAddPromotion}
          className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-stitch space-y-4 h-fit"
        >
          <h3 className="text-xs font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
            <Plus className="w-4 h-4 text-sky-600" />
            <span>Buat Kode Voucher Baru</span>
          </h3>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Kode Voucher *
            </label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="MISAL: HEMAT10K"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2 px-3 text-xs font-mono font-bold uppercase focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Judul Promo
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Diskon Pembelian Pertama"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Potongan (Rp)
              </label>
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2 px-3 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Min. Belanja
              </label>
              <input
                type="number"
                value={minOrder}
                onChange={(e) => setMinOrder(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2 px-3 text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? 'Menyimpan ke Supabase...' : '+ Simpan Voucher'}
          </button>
        </form>

        {/* Voucher List */}
        <div className="md:col-span-2 space-y-3">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400 bg-white rounded-3xl border border-slate-200/80">
              <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
              <span className="text-xs">Memuat voucher aktif...</span>
            </div>
          ) : promotions.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs bg-white rounded-3xl border border-slate-200/80">
              Belum ada voucher aktif di database.
            </div>
          ) : (
            promotions.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-stitch flex items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold font-mono text-sky-800 bg-sky-100/80 px-2 py-0.5 rounded-md">
                        {p.code}
                      </span>
                      <span className="text-xs font-bold text-slate-900">
                        {p.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {p.description}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-sm font-extrabold text-emerald-600">
                    -{formatRupiah(p.discount_value)}
                  </span>
                  <div className="text-[10px] text-slate-400">
                    Min. {formatRupiah(p.min_order_amount)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
