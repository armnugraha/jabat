'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  User,
  MapPin,
  FileText,
  MessageSquare,
  Phone,
  ShieldCheck,
  ChevronRight,
  LogOut,
  Building2,
  Lock,
  Mail,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Check,
  X,
  Loader2,
  UserCog,
  Camera,
  Edit3,
} from 'lucide-react';
import { Header } from '@/components/customer/Header';
import { BottomNav } from '@/components/customer/BottomNav';
import { UserAvatar } from '@/components/customer/UserAvatar';
import { useAuth } from '@/lib/store/auth-context';
import { StoreSettings, CustomerAddress } from '@/lib/types';

function AccountContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login';
  const { user, role, login, register, updateUser, logout, authFetch, isLoading } = useAuth();
  const [store, setStore] = useState<StoreSettings | null>(null);

  // Address Modal States
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);

  // Edit Profile States
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAvatarUrl, setEditAvatarUrl] = useState('');
  const [editSipaNumber, setEditSipaNumber] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  // New Address Form State
  const [newLabel, setNewLabel] = useState('Rumah');
  const [newRecipientName, setNewRecipientName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddressLine, setNewAddressLine] = useState('');
  const [newSubdistrict, setNewSubdistrict] = useState('');
  const [newCity, setNewCity] = useState('Jakarta Selatan');
  const [newPostalCode, setNewPostalCode] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressToast, setAddressToast] = useState('');

  useEffect(() => {
    fetch('/api/store', { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) setStore(json.data);
      })
      .catch(() => {});
  }, []);

  const loadAddresses = () => {
    if (!user?.id) return;
    setIsLoadingAddresses(true);

    authFetch(`/api/addresses?userId=${user.id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setAddresses(json.data);
        }
      })
      .catch((err) => console.error('Failed to load addresses:', err))
      .finally(() => setIsLoadingAddresses(false));
  };

  useEffect(() => {
    if (user) {
      loadAddresses();
      setNewRecipientName(user.full_name || '');
      setNewPhone(user.phone || '');
    }
  }, [user]);

  // Auth Form States (when not logged in)
  const [authMode, setAuthMode] = useState<'login' | 'register'>(initialMode);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    } else if (res.user?.role === 'admin' || res.user?.role === 'pharmacist') {
      router.push('/admin');
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

  const handleSaveNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!newRecipientName.trim() || !newPhone.trim() || !newAddressLine.trim()) {
      alert('Nama penerima, nomor telepon, dan alamat lengkap wajib diisi.');
      return;
    }

    setIsSavingAddress(true);
    try {
      const res = await authFetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: user.id,
          label: newLabel,
          recipientName: newRecipientName.trim(),
          phone: newPhone.trim(),
          addressLine: newAddressLine.trim(),
          subdistrict: newSubdistrict.trim(),
          city: newCity.trim(),
          postalCode: newPostalCode.trim(),
          deliveryNotes: newNotes.trim(),
          isPrimary: addresses.length === 0,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const newAddr = json.data;
        const updatedList = [newAddr, ...addresses.filter((a) => a.id !== newAddr.id)];
        setAddresses(updatedList);

        setIsAddingAddress(false);
        setAddressToast('Alamat baru berhasil ditambahkan!');
        setTimeout(() => setAddressToast(''), 3000);

        setNewAddressLine('');
        setNewSubdistrict('');
        setNewPostalCode('');
        setNewNotes('');
      } else {
        alert(json.error || 'Gagal menyimpan alamat');
      }
    } catch (err) {
      console.error('Save address error:', err);
      alert('Gagal menyimpan alamat pengiriman.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Hapus alamat pengiriman ini?')) return;

    try {
      await authFetch(`/api/addresses?id=${id}`, { method: 'DELETE' });
      const updatedList = addresses.filter((a) => a.id !== id);
      setAddresses(updatedList);
      setAddressToast('Alamat berhasil dihapus');
      setTimeout(() => setAddressToast(''), 3000);
    } catch (err) {
      console.error('Delete address error:', err);
    }
  };

  const handleSetPrimary = async (addr: CustomerAddress) => {
    if (!user) return;
    try {
      // Optimistically update UI so user immediately sees exactly ONE primary address
      const updatedList = addresses.map((a) => ({
        ...a,
        is_primary: a.id === addr.id,
      }));
      setAddresses(updatedList);

      const res = await authFetch('/api/addresses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: addr.id,
          customerId: user.id,
          isPrimary: true,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        console.error('Failed to set primary on server:', json.error);
        loadAddresses();
      } else {
        setAddressToast('Alamat utama berhasil diperbarui');
        setTimeout(() => setAddressToast(''), 3000);
      }
    } catch (err) {
      console.error('Set primary error:', err);
      loadAddresses();
    }
  };

  const handleOpenEditProfile = () => {
    if (!user) return;
    setEditFullName(user.full_name || '');
    setEditPhone(user.phone || '');
    setEditAvatarUrl(user.avatar_url || '');
    setEditSipaNumber(user.sipa_number || '');
    setIsEditProfileOpen(true);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'avatars');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (json.success && json.url) {
        setEditAvatarUrl(json.url);
      } else {
        alert(json.error || 'Gagal mengunggah foto profil');
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
      alert('Terjadi kesalahan saat mengunggah foto profil.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!editFullName.trim()) {
      alert('Nama lengkap tidak boleh kosong.');
      return;
    }

    if (!editPhone.trim()) {
      alert('Nomor telepon / WhatsApp tidak boleh kosong.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await authFetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          fullName: editFullName.trim(),
          phone: editPhone.trim(),
          avatarUrl: editAvatarUrl.trim() || null,
          sipaNumber: editSipaNumber.trim() || null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        updateUser({
          full_name: editFullName.trim(),
          phone: editPhone.trim(),
          avatar_url: editAvatarUrl.trim() || undefined,
          sipa_number: editSipaNumber.trim() || undefined,
        });

        setIsEditProfileOpen(false);
        setAddressToast('Profil akun berhasil diperbarui!');
        setTimeout(() => setAddressToast(''), 3000);
      } else {
        alert(json.error || 'Gagal memperbarui profil akun.');
      }
    } catch (err) {
      console.error('Save profile error:', err);
      alert('Terjadi kesalahan saat menyimpan profil akun.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const accountMenus = [
    {
      title: 'Edit Profil Akun',
      subtitle: 'Perbarui nama lengkap, nomor WhatsApp, dan foto profil',
      icon: UserCog,
      href: undefined,
      onClick: handleOpenEditProfile,
    },
    {
      title: 'Alamat Pengiriman',
      subtitle: `${addresses.length} alamat tersimpan untuk pengiriman kurir`,
      icon: MapPin,
      href: undefined,
      onClick: () => {
        setIsAddingAddress(false);
        setIsAddressModalOpen(true);
      },
    },
    {
      title: 'Riwayat Pesanan Obat',
      subtitle: 'Pantau status peracikan & pengiriman kurir',
      icon: FileText,
      href: '/orders',
      onClick: undefined,
    },
    {
      title: 'Konsultasi Apoteker',
      subtitle: 'Riwayat chat & rekomendasi obat dari apoteker',
      icon: MessageSquare,
      href: '/chat',
      onClick: undefined,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-24">
      <Header />

      <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 md:px-8 space-y-6 pt-4">
        {/* Toast */}
        {addressToast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{addressToast}</span>
          </div>
        )}

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
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 pl-10 pr-10 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 absolute right-3 top-1/2 -translate-y-1/2 transition"
                    title={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
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

                {/* Edit Profile Button */}
                <button
                  type="button"
                  onClick={handleOpenEditProfile}
                  className="w-full py-2.5 rounded-xl border border-sky-200 bg-sky-50/70 hover:bg-sky-100 text-sky-700 text-xs font-bold transition flex items-center justify-center gap-1.5 mt-2 shadow-2xs"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profil Akun</span>
                </button>

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
                  if (item.href) {
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
                  }
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={item.onClick}
                      className="w-full text-left flex items-center justify-between p-3.5 hover:bg-slate-50 rounded-2xl transition group"
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
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Address Management Modal in Account */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-600" />
                <span>{isAddingAddress ? 'Tambah Alamat Baru' : 'Daftar Alamat Pengiriman'}</span>
              </h3>
              <button
                onClick={() => {
                  setIsAddressModalOpen(false);
                  setIsAddingAddress(false);
                }}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!isAddingAddress ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setIsAddingAddress(true)}
                  className="w-full py-2.5 px-3 rounded-2xl border-2 border-dashed border-sky-300 text-sky-600 hover:bg-sky-50 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Alamat Baru</span>
                </button>

                {isLoadingAddresses ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-slate-400 text-xs">
                    <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
                    <span>Memuat alamat tersimpan...</span>
                  </div>
                ) : addresses.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    Belum ada alamat tersimpan. Silakan tambahkan alamat baru.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 transition text-left space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              {addr.label} – {addr.recipient_name}
                            </span>
                            {addr.is_primary && (
                              <span className="px-1.5 py-0.2 rounded bg-sky-600 text-white text-[9px] font-bold">
                                Utama
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            {!addr.is_primary && (
                              <button
                                type="button"
                                onClick={() => handleSetPrimary(addr)}
                                className="text-[10px] font-bold text-sky-600 hover:text-sky-700 px-2 py-0.5 bg-sky-50 rounded-lg"
                              >
                                Jadikan Utama
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteAddress(addr.id, e)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition"
                              title="Hapus Alamat"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-500 font-mono">
                          {addr.phone}
                        </div>

                        <p className="text-xs text-slate-700 leading-relaxed">
                          {addr.address_line}
                          {addr.subdistrict && `, ${addr.subdistrict}`}
                          {addr.city && `, ${addr.city}`}
                          {addr.postal_code && ` ${addr.postal_code}`}
                        </p>

                        {addr.delivery_notes && (
                          <div className="text-[10px] text-slate-500 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                            Catatan: {addr.delivery_notes}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Add New Address Form */
              <form onSubmit={handleSaveNewAddress} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Label Alamat
                  </label>
                  <div className="flex gap-2">
                    {['Rumah', 'Kantor', 'Apartemen', 'Lainnya'].map((lbl) => (
                      <button
                        type="button"
                        key={lbl}
                        onClick={() => setNewLabel(lbl)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                          newLabel === lbl
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Penerima *
                  </label>
                  <input
                    type="text"
                    required
                    value={newRecipientName}
                    onChange={(e) => setNewRecipientName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor WhatsApp / Telepon *
                  </label>
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="0812-3456-7890"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Alamat Lengkap & Nomor Rumah *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={newAddressLine}
                    onChange={(e) => setNewAddressLine(e.target.value)}
                    placeholder="Nama jalan, RT/RW, nomor rumah, blok..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Kecamatan / Kelurahan
                    </label>
                    <input
                      type="text"
                      value={newSubdistrict}
                      onChange={(e) => setNewSubdistrict(e.target.value)}
                      placeholder="Tebet Barat"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Kota
                    </label>
                    <input
                      type="text"
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      placeholder="Jakarta Selatan"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Kode Pos
                    </label>
                    <input
                      type="text"
                      value={newPostalCode}
                      onChange={(e) => setNewPostalCode(e.target.value)}
                      placeholder="12810"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Patokan / Catatan
                    </label>
                    <input
                      type="text"
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="Pagar hitam..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingAddress(false)}
                    className="w-1/3 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingAddress}
                    className="w-2/3 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isSavingAddress ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    <span>{isSavingAddress ? 'Menyimpan...' : 'Simpan Alamat'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UserCog className="w-4 h-4 text-sky-600" />
                <span>Edit Profil Akun</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsEditProfileOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Avatar Upload Section */}
              <div className="flex flex-col items-center justify-center space-y-2 pt-1 pb-2">
                <div className="relative group">
                  <div className="w-20 h-20 rounded-full border-2 border-sky-100 overflow-hidden bg-slate-50 flex items-center justify-center shadow-inner">
                    {editAvatarUrl ? (
                      <img
                        src={editAvatarUrl}
                        alt="Avatar Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-10 h-10 text-slate-300" />
                    )}
                  </div>

                  <label className="absolute bottom-0 right-0 p-1.5 rounded-full bg-sky-600 hover:bg-sky-700 text-white shadow-md cursor-pointer transition">
                    {isUploadingAvatar ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={isUploadingAvatar}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-bold text-sky-600 hover:text-sky-700 cursor-pointer">
                    {isUploadingAvatar ? 'Mengunggah...' : 'Ganti Foto Profil'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={isUploadingAvatar}
                      className="hidden"
                    />
                  </label>
                  {editAvatarUrl && (
                    <>
                      <span className="text-slate-300 text-xs">•</span>
                      <button
                        type="button"
                        onClick={() => setEditAvatarUrl('')}
                        className="text-[11px] font-bold text-rose-500 hover:text-rose-700"
                      >
                        Hapus Foto
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Lengkap *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-semibold"
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
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="0812-3456-7890"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-3 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-semibold"
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Alamat Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl py-2.5 pl-10 pr-3 text-xs text-slate-500 cursor-not-allowed font-mono"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {(user?.role === 'pharmacist' || user?.role === 'admin') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor SIPA (Surat Izin Praktik Apoteker)
                  </label>
                  <input
                    type="text"
                    value={editSipaNumber}
                    onChange={(e) => setEditSipaNumber(e.target.value)}
                    placeholder="19870412/SIPA-31.74/2021/2048"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-mono"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditProfileOpen(false)}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile || isUploadingAvatar}
                  className="w-2/3 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-sky-600/25 flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                >
                  {isSavingProfile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

