'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingBag,
  FileCheck2,
  MessageSquare,
  Users,
  Tag,
  Store,
  BarChart3,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { UserAvatar } from '@/components/customer/UserAvatar';
import { useAuth } from '@/lib/store/auth-context';
import { StoreSettings, Order } from '@/lib/types';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, role } = useAuth();
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0);
  const [pendingRxCount, setPendingRxCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/store')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) setStoreSettings(json.data);
      })
      .catch(() => {});

    fetch('/api/orders?role=admin')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          const orders: Order[] = json.data;
          setPendingOrdersCount(orders.filter((o) => o.status === 'pending' || o.status === 'preparing').length);
          setPendingRxCount(orders.filter((o) => o.requires_prescription && o.prescription_status === 'pending').length);
        }
      })
      .catch(() => {});
  }, [pathname]);

  const navigationItems = [
    { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { label: 'Kelola Obat & Produk', href: '/admin/products', icon: Package },
    { label: 'Kategori Obat', href: '/admin/categories', icon: FolderTree },
    { label: 'Pesanan Masuk', href: '/admin/orders', icon: ShoppingBag, badge: pendingOrdersCount || undefined },
    { label: 'Verifikasi Resep', href: '/admin/prescriptions', icon: FileCheck2, badge: pendingRxCount || undefined, highlight: true },
    { label: 'Meja Konsultasi Chat', href: '/admin/chat', icon: MessageSquare },
    { label: 'Data Pelanggan', href: '/admin/customers', icon: Users },
    { label: 'Promo & Voucher', href: '/admin/promotions', icon: Tag },
    { label: 'Pengaturan Apotek', href: '/admin/store', icon: Store },
    { label: 'Laporan Penjualan', href: '/admin/reports', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row w-full max-w-none text-slate-900">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white shrink-0 border-r border-slate-800">
        {/* Pharmacy Branding */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center text-white shadow-md shadow-sky-500/30">
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
          <div className="min-w-0">
            <h2 className="text-xs font-bold leading-tight truncate">
              {storeSettings?.store_name || 'Apotek Jabat'}
            </h2>
            <p className="text-[10px] text-sky-400 font-medium truncate">
              Portal Staf & Apoteker PJ
            </p>
          </div>
        </div>

        {/* User Role Card */}
        <div className="p-3 mx-3 my-2 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center gap-2.5">
          <div className="relative">
            <UserAvatar
              name={user?.full_name || storeSettings?.pharmacist_name || 'Staf Farmasi'}
              avatarUrl={
                user?.avatar_url && !user.avatar_url.includes('images.unsplash.com/photo-1535713875002-d1d0cf377fde')
                  ? user.avatar_url
                  : null
              }
              role={role}
              size="sm"
            />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-900" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-white truncate">
              {user?.full_name || storeSettings?.pharmacist_name || 'Staf Farmasi'}
            </div>
            <div className="text-[10px] text-slate-400 capitalize">
              Role: <span className="text-sky-400 font-semibold">{role}</span>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                  isActive
                    ? 'bg-sky-600 text-white font-bold shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${
                      item.highlight
                        ? 'bg-rose-500 text-white'
                        : 'bg-sky-800 text-sky-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-800 space-y-1">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-sky-300 hover:bg-slate-800 font-medium transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Lihat Toko Customer</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 min-h-screen">
        {/* Top Navbar for Mobile & Tablet */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div>
              <h1 className="text-sm font-bold text-slate-900 leading-tight">
                {storeSettings?.store_name || 'Apotek Jabat'}
              </h1>
              <p className="text-[10px] text-slate-500">
                SIPA Farmasi: {storeSettings?.pharmacist_sipa || 'SIPA Resmi'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="hidden sm:inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 text-xs font-bold transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Toko Depan</span>
            </Link>
            <span className="px-2.5 py-1 rounded-lg font-bold text-[11px] bg-slate-100 text-slate-700 border border-slate-200 capitalize">
              {role === 'pharmacist' ? 'Apoteker PJ' : role === 'admin' ? 'Administrator' : 'Staff'}
            </span>
          </div>
        </header>

        {/* Mobile Slide-down Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-slate-900 text-white p-4 space-y-1 shadow-2xl border-b border-slate-800">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-800 text-xs font-semibold"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* Page Content Body */}
        <div className="p-4 sm:p-6 flex-1">{children}</div>
      </div>
    </div>
  );
}
