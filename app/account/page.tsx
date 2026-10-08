'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  User,
  MapPin,
  FileText,
  MessageSquare,
  Phone,
  ShieldCheck,
  ChevronRight,
  LogOut,
  HelpCircle,
  Bell,
  Building2,
  Lock,
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Header } from '@/components/customer/Header';
import { BottomNav } from '@/components/customer/BottomNav';
import { UserAvatar } from '@/components/customer/UserAvatar';
import { useAuth } from '@/lib/store/auth-context';
import { StoreSettings } from '@/lib/types';

function AccountContent() {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const { user, role, login, register, logout, isLoading } = useAuth();
  const [store, setStore] = useState<StoreSettings | null>(null);

  useEffect(() => {
    fetch('/api/store')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) setStore(json.data);
      })
      .catch(() => {});
  }, []);

  // Auth Form States (when not logged in)
  const [authMode, setAuthMode] = useState<'login' | 'register'>(initialMode);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (searchParams.get('mode') === 'register') {
      setAuthMode('register');
    }
  }, [searchParams]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);

    const res = await login(identifier, password);
    setIsSubmitting(false);

    if (!res.success) {
      setAuthError(res.error || 'Gagal masuk. Periksa kembali data Anda.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);

    const res = await register(fullName, regPhone, regEmail, password);
    setIsSubmitting(false);

    if (!res.success) {
      setAuthError(res.error || 'Gagal mendaftar. Silakan coba lagi.');
    }
  };

  const accountMenus = [
    {
      title: 'Riwayat Pesanan Obat',
      subtitle: 'Pantau status peracikan & pengiriman kurir',
      icon: FileText,
      href: '/orders',
    },
    {
      title: 'Alamat Pengiriman',
      subtitle: 'Kelola alamat rumah dan instruksi kurir',
      icon: MapPin,
      href: '/cart',
    },
    {
      title: 'Konsultasi Apoteker',
      subtitle: 'Riwayat chat & rekomendasi obat dari apoteker',
      icon: MessageSquare,
      href: '/chat',
    },
    {
      title: 'Notifikasi & Pengingat Obat',
      subtitle: 'Atur jadwal minum obat harian',
      icon: Bell,
      href: '#',
    },
    {
      title: 'Pusat Bantuan & Kebijakan BPOM',
      subtitle: 'Standar regulasi farmasi & retur obat',
      icon: HelpCircle,
      href: '#',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-24">
      <Header />

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 md:px-8 space-y-6 pt-4">
        {/* =========================================================================
            STATE 1: USER IS NOT LOGGED IN -> REQUIRE AUTHENTICATION
        ========================================================================= */}
        {!user ? (
          <div className="max-w-md mx-auto bg-white rounded-3xl border border-slate-200/80 p-6 shadow-stitch space-y-4 animate-in fade-in">
            {/* Header / Logo */}
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center mx-auto shadow-md shadow-sky-500/25">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-sm font-extrabold text-slate-900 pt-1">
                Masuk ke Akun Apotek Sehat Mandiri
              </h2>
              <p className="text-[11px] text-slate-500">
                Akses riwayat resep, pelacakan obat, dan konsultasi apoteker
              </p>
            </div>

            {/* Login / Register Toggle Tabs */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setAuthError('');
                }}
                className={`py-2 rounded-xl transition ${
                  authMode === 'login'
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setAuthError('');
                }}
                className={`py-2 rounded-xl transition ${
                  authMode === 'register'
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Daftar Pasien Baru
              </button>
            </div>

            {/* Error Notification */}
            {authError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{authError}</span>
              </div>
            )}

            {/* Auth Form */}
            <form
              onSubmit={authMode === 'login' ? handleLoginSubmit : handleRegisterSubmit}
              className="space-y-3 pt-1"
            >
              {authMode === 'register' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nama Lengkap Pasien *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Contoh: Budi Santoso"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 pl-10 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nomor WhatsApp / Telepon *
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="0812-3456-7890"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 pl-10 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Alamat Email *
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="email@anda.com"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 pl-10 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email / Nomor WhatsApp *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="email@anda.com atau 0812-3456-7890"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 pl-10 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kata Sandi (Password) *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 pl-10 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-2xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-600/25 transition disabled:opacity-50 mt-2"
              >
                <span>{isSubmitting ? 'Memproses ke Server...' : authMode === 'login' ? 'Masuk Sekarang' : 'Daftar Akun'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          /* =========================================================================
              STATE 2: USER IS AUTHENTICATED -> SHOW FULL ACCOUNT PROFILE FROM API
          ========================================================================= */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left Column: Profile Card & Store Info */}
            <div className="md:col-span-5 space-y-4">
              {/* User Profile Card */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-stitch space-y-3">
                <div className="flex items-start gap-3.5">
                  <UserAvatar
                    name={user.full_name}
                    avatarUrl={
                      user.avatar_url && !user.avatar_url.includes('images.unsplash.com/photo-1535713875002-d1d0cf377fde')
                        ? user.avatar_url
                        : null
                    }
                    role={user.role}
                    size="lg"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-bold text-slate-900 truncate">
                        {user.full_name}
                      </h3>
                      <ShieldCheck className="w-4 h-4 text-sky-600 fill-sky-100 shrink-0" />
                    </div>
                    <p className="text-xs text-slate-600 font-medium mt-0.5 truncate">
                      {user.phone || 'Nomor WhatsApp belum diatur'}
                    </p>
                    {user.email && (
                      <p className="text-[11px] text-slate-400 font-mono truncate">
                        {user.email}
                      </p>
                    )}
                    {user.sipa_number && (
                      <p className="text-[10px] text-emerald-700 font-mono font-bold mt-0.5 truncate">
                        SIPA: {user.sipa_number}
                      </p>
                    )}
                    <span className="inline-block mt-2 px-2.5 py-0.5 rounded-md bg-sky-50 text-sky-700 text-[10px] font-bold capitalize">
                      Role: {user.role === 'pharmacist' ? 'Apoteker PJ' : user.role === 'admin' ? 'Administrator' : 'Pasien Terdaftar'}
                    </span>
                  </div>
                </div>

                {user.role !== 'customer' && (
                  <Link
                    href="/admin"
                    className="w-full py-2.5 rounded-xl bg-slate-900 text-sky-300 hover:bg-slate-800 text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 mt-2"
                  >
                    <span>Buka Portal Staf Apotek</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>

              {/* Pharmacy Emergency Contact Card */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-stitch space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-sky-600" />
                  <h3 className="text-xs font-bold text-slate-900">
                    Kontak {store?.store_name || 'Apotek Jabat'}
                  </h3>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-800">{store?.address || 'Jl. Tebet Barat Dalam Raya No. 42, Jakarta Selatan'}</p>
                  <p className="text-[11px] text-slate-500">
                    Buka: {store?.opening_time || '08:00'} – {store?.closing_time || '21:00'} WIB
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <a
                    href={`https://wa.me/${store?.whatsapp || '6281234567890'}`}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2.5 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                  <a
                    href={`tel:${store?.phone || '081234567890'}`}
                    className="py-2.5 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Telepon</span>
                  </a>
                </div>
              </div>

              {/* Real Logout Button */}
              <button
                onClick={() => logout()}
                className="w-full py-3.5 rounded-2xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center justify-center gap-2 shadow-stitch transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar dari Akun</span>
              </button>
            </div>

            {/* Right Column: Account Menu List */}
            <div className="md:col-span-7">
              <div className="bg-white rounded-3xl border border-slate-200/80 p-3 shadow-stitch divide-y divide-slate-100">
                <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Menu Pasien
                </div>
                {accountMenus.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={idx}
                      href={item.href}
                      className="flex items-center justify-between p-3.5 hover:bg-slate-50 rounded-2xl transition group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-700 group-hover:bg-sky-50 group-hover:text-sky-600 transition flex items-center justify-center shrink-0">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs md:text-sm font-bold text-slate-900 group-hover:text-sky-700 transition">
                            {item.title}
                          </h4>
                          <p className="text-[11px] text-slate-400">{item.subtitle}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <AccountContent />
    </Suspense>
  );
}
