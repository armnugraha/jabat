'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  Phone,
  ArrowRight,
  User,
  AlertCircle,
  LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/store/auth-context';

interface AuthRequiredCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
}

export const AuthRequiredCard: React.FC<AuthRequiredCardProps> = ({
  icon: Icon,
  title,
  description,
  badge = 'Perlu Autentikasi',
}) => {
  const { login, register } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);

    const res = await login(identifier.trim().toLowerCase(), password, 'customer');
    setIsSubmitting(false);

    if (!res.success) {
      setAuthError(res.error || 'Gagal masuk. Periksa kembali nomor atau email Anda.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmitting(true);

    const cleanInput = identifier.trim().toLowerCase();
    const isEmail = cleanInput.includes('@');
    const email = isEmail ? cleanInput : undefined;
    const phone = isEmail ? '' : cleanInput;
    const res = await register(fullName, phone || cleanInput, email, password);
    setIsSubmitting(false);

    if (!res.success) {
      setAuthError(res.error || 'Gagal mendaftar. Silakan coba lagi.');
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-stitch space-y-4 animate-in fade-in">
      {/* Icon & Title */}
      <div className="text-center space-y-1.5">
        <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center mx-auto shadow-xs">
          <Icon className="w-6 h-6" />
        </div>
        <div className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
          {badge}
        </div>
        <h2 className="text-sm font-extrabold text-slate-900 leading-snug">
          {title}
        </h2>
        <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
          {description}
        </p>
      </div>

      {/* Tabs */}
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
          Masuk Akun
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

      {authError && (
        <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{authError}</span>
        </div>
      )}

      {/* Form */}
      <form
        onSubmit={authMode === 'login' ? handleLoginSubmit : handleRegisterSubmit}
        className="space-y-3"
      >
        {authMode === 'register' && (
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
        )}

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Nomor WhatsApp / Email *
          </label>
          <div className="relative">
            <input
              type="text"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value.toLowerCase())}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder="0812-3456-7890 atau email@anda.com"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 pl-10 pr-3 text-xs lowercase focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
            />
            <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Kata Sandi (Password)
          </label>
          <div className="relative">
            <input
              type="password"
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
          <span>
            {isSubmitting
              ? 'Memproses...'
              : authMode === 'login'
              ? 'Masuk & Lanjutkan'
              : 'Daftar Akun'}
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
