'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, ShieldCheck, MapPin, Clock, Home, Pill, FileText, MessageSquare, User, LayoutDashboard } from 'lucide-react';
import { useCart } from '@/lib/store/cart-context';
import { useAuth } from '@/lib/store/auth-context';
import { StoreSettings } from '@/lib/types';
import { mockStoreSettings } from '@/lib/data/mock-data';
import { isStoreOpenNow } from '@/lib/utils';

interface HeaderProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  showBack,
  onBack,
  rightAction,
}) => {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { user, role } = useAuth();
  const [store, setStore] = useState<StoreSettings>(mockStoreSettings);

  useEffect(() => {
    fetch('/api/store', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setStore(json.data);
        }
      })
      .catch((err) => console.error('Failed to load store settings:', err));
  }, []);

  const navLinks = [
    { label: 'Beranda', href: '/', icon: Home, isActive: pathname === '/' },
    { label: 'Katalog Obat', href: '/products', icon: Pill, isActive: pathname.startsWith('/products') },
    { label: 'Riwayat Pesanan', href: '/orders', icon: FileText, isActive: pathname.startsWith('/orders') },
    { label: 'Konsultasi Apoteker', href: '/chat', icon: MessageSquare, isActive: pathname.startsWith('/chat') },
    { label: 'Akun Saya', href: '/account', icon: User, isActive: pathname.startsWith('/account') },
  ];

  const { isOpen, statusText } = isStoreOpenNow(store);
  const branchName = store.branch_name || 'Rancaekek';
  const fullAddress = store.address || 'Jl. Raya Rancaekek No. 88, Bandung';
  const storeName = store.store_name || 'JABAT (Jajap Obat)';
  const tagline = store.tagline || 'Farmasi Digital Resmi & Terpercaya';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 transition-all">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center text-white shadow-sm shadow-sky-500/30 group-hover:scale-105 transition shrink-0">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-5 h-5"
                >
                  <path d="M12 6v12M6 12h12" />
                  <rect x="3" y="3" width="18" height="18" rx="4" strokeWidth="2" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h1 className="text-[15px] font-bold text-slate-900 leading-tight">
                    {storeName}
                  </h1>
                  <ShieldCheck className="w-4 h-4 text-sky-600 fill-sky-100 shrink-0" />
                </div>
                <p className="text-[11px] text-slate-500">
                  {tagline}
                </p>
              </div>
            </Link>

            {/* Status Pills (Desktop Inline) */}
            <div className="hidden lg:flex items-center gap-2 ml-2">
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                  isOpen
                    ? 'bg-emerald-50 border-emerald-200/70 text-emerald-700'
                    : 'bg-rose-50 border-rose-200/70 text-rose-700'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                <span>{statusText}</span>
              </div>
              <div
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200/70 text-[11px] font-medium text-slate-600"
                title={fullAddress}
              >
                <MapPin className="w-3 h-3 text-slate-500" />
                <span className="truncate max-w-[200px]">{branchName}</span>
              </div>
            </div>
          </div>

          {/* Desktop Navigation Links (Icon-Only Mode) */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-1.5">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  title={link.label}
                  aria-label={link.label}
                  className={`p-2.5 rounded-xl transition ${
                    link.isActive
                      ? 'bg-sky-50 text-sky-700 font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </Link>
              );
            })}

            {/* Portal Staf Link (for admin/pharmacist users, icon only) */}
            {(role === 'admin' || role === 'pharmacist') && (
              <Link
                href="/admin"
                title="Portal Staf Admin & Farmasi"
                aria-label="Portal Staf"
                className="p-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition shadow-xs ml-1"
              >
                <LayoutDashboard className="w-5 h-5" />
              </Link>
            )}
          </nav>

          {/* Right Action & Cart Icon (Icon Only, No text) */}
          <div className="flex items-center gap-2">
            {rightAction}
            <Link
              href="/cart"
              className="relative w-9 h-9 rounded-xl text-slate-700 hover:bg-slate-100 transition flex items-center justify-center border border-slate-200/80 bg-white shadow-2xs"
              aria-label="Keranjang Belanja"
              title="Keranjang Belanja"
            >
              <ShoppingBag className="w-4.5 h-4.5 text-sky-600" />
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-sky-600 text-white text-[10px] font-extrabold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-xs ring-2 ring-white leading-none">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Status Pill & Location (Mobile View) */}
        <div className="flex lg:hidden items-center gap-2 mt-2 pt-2 border-t border-slate-100">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${
              isOpen
                ? 'bg-emerald-50 border-emerald-200/70 text-emerald-700'
                : 'bg-rose-50 border-rose-200/70 text-rose-700'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span>{statusText}</span>
          </div>
          <div
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200/70 text-[10px] font-medium text-slate-600"
            title={fullAddress}
          >
            <MapPin className="w-3 h-3 text-slate-500" />
            <span className="truncate max-w-[170px]">{branchName}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

