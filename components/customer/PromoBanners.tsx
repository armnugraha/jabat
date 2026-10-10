'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, Bike, MessageCircle, Building2, UserCheck, FileText, ChevronRight } from 'lucide-react';
import { StoreSettings } from '@/lib/types';

export const HeroBanner: React.FC = () => {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 via-sky-600 to-sky-700 text-white p-6 shadow-stitch-card">
      <div className="absolute -right-6 -bottom-6 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />
      <div className="absolute right-4 top-4 opacity-15 pointer-events-none">
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 6v12M6 12h12" />
        </svg>
      </div>

      <div className="relative z-10 max-w-md md:max-w-xl">
        <h2 className="text-lg md:text-2xl font-extrabold leading-tight tracking-tight mb-2">
          Kebutuhan Kesehatan Keluarga, Lebih Praktis & Aman.
        </h2>
        <p className="text-xs md:text-sm text-sky-100 leading-relaxed mb-4">
          Dapatkan obat resmi BPOM, suplemen kesehatan, atau konsultasi gratis dengan Apoteker Penanggung Jawab kami langsung ke rumah.
        </p>
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white text-sky-700 font-bold text-xs md:text-sm shadow-md hover:bg-sky-50 active:scale-95 transition"
        >
          <span>Belanja Sekarang</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};

export const FreeShippingBanner: React.FC = () => {
  return (
    <div className="rounded-2xl border border-orange-200/90 bg-orange-50/70 p-3.5 flex items-center justify-between gap-3">
      <div>
        <div className="inline-block px-2 py-0.5 rounded-md bg-orange-500 text-white text-[9px] font-extrabold tracking-wider uppercase mb-1">
          Spesial Pekan Ini
        </div>
        <h3 className="text-xs font-bold text-slate-900 leading-snug">
          Gratis Ongkir Instan Tebet
        </h3>
        <p className="text-[11px] text-slate-600 mt-0.5">
          Belanja minimal Rp 100.000 via kurir resmi apotek langsung tiba
        </p>
      </div>
      <div className="w-11 h-11 rounded-2xl bg-orange-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-orange-600/30">
        <Bike className="w-6 h-6" />
      </div>
    </div>
  );
};

export const PharmacistConsultationCTA: React.FC = () => {
  const [store, setStore] = useState<StoreSettings | null>(null);

  useEffect(() => {
    fetch('/api/store', { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) setStore(json.data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="rounded-2xl border border-sky-200/80 bg-sky-50/70 p-3.5 flex items-center justify-between gap-3">
      <div>
        <div className="inline-block px-2 py-0.5 rounded-md bg-sky-600 text-white text-[9px] font-extrabold tracking-wider uppercase mb-1">
          Apoteker Siaga
        </div>
        <h3 className="text-xs font-bold text-slate-900 leading-snug">
          Perlu Bantuan Memilih Obat?
        </h3>
        <p className="text-[11px] text-slate-600 mt-0.5">
          Konsultasikan keluhan Anda ke {store?.pharmacist_name || 'Apoteker Kami'}
        </p>
      </div>
      <Link
        href="/chat"
        className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shrink-0 shadow-sm transition active:scale-95 flex items-center gap-1.5"
      >
        <span>Chat Sekarang</span>
      </Link>
    </div>
  );
};

export const StoreInfoFooterCard: React.FC = () => {
  const [store, setStore] = useState<StoreSettings | null>(null);

  useEffect(() => {
    fetch('/api/store', { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) setStore(json.data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-stitch">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0 border border-sky-100">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-900">
            {store?.store_name || 'Apotek Jabat'} ({store?.branch_name || 'Tebet Barat'})
          </h4>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
            {store?.address || 'Jl. Tebet Barat Dalam Raya No. 42, Jakarta Selatan'}
          </p>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 grid grid-cols-1 gap-1.5 text-[11px] text-slate-600">
        <div className="flex items-center gap-2">
          <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>
            Apoteker PJ: <strong className="text-slate-800">{store?.pharmacist_name || 'apt. Siti Rahma, S.Farm.'}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="w-3.5 h-3.5 text-sky-600 shrink-0" />
          <span>
            Nomor SIPA: <span className="font-mono text-slate-700">{store?.pharmacist_sipa || 'SIPA Resmi'}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
