'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../supabase/client';

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  login: (emailOrPhone: string, password?: string, selectedRole?: UserRole) => Promise<{ success: boolean; error?: string }>;
  register: (fullName: string, phone: string, email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load and verify session on mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('asm_auth_user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);

        // Refresh profile data from API
        if (parsed?.id) {
          fetch(`/api/profile?userId=${parsed.id}`)
            .then((res) => res.json())
            .then((json) => {
              if (json.success && json.data) {
                const refreshed = { ...parsed, ...json.data };
                setUser(refreshed);
                localStorage.setItem('asm_auth_user', JSON.stringify(refreshed));
              }
            })
            .catch((err) => console.warn('Profile refresh notice:', err));
        }
      }
    } catch (e) {
      console.error('Failed to parse saved user', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (
    emailOrPhone: string,
    password?: string,
    selectedRole: UserRole = 'customer'
  ) => {
    setIsLoading(true);
    try {
      const cleanInput = emailOrPhone.trim();
      if (!cleanInput) {
        return { success: false, error: 'Email atau Nomor WhatsApp wajib diisi.' };
      }

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: cleanInput,
          password: password || '',
          selectedRole,
        }),
      });

      const json = await res.json();

      if (!json.success || !json.user) {
        return {
          success: false,
          error: json.error || 'Akun tidak ditemukan atau kata sandi tidak cocok. Silakan daftar jika belum memiliki akun.',
        };
      }

      setUser(json.user);
      localStorage.setItem('asm_auth_user', JSON.stringify(json.user));
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Terjadi gangguan jaringan saat login ke server.',
      };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    fullName: string,
    phone: string,
    email: string,
    password?: string
  ) => {
    setIsLoading(true);
    try {
      if (!fullName.trim() || !phone.trim() || !email.trim()) {
        return { success: false, error: 'Nama lengkap, nomor telepon, dan email wajib diisi.' };
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          password: password || 'Apotek123!',
        }),
      });

      const json = await res.json();

      if (!json.success || !json.user) {
        return {
          success: false,
          error: json.error || 'Gagal mendaftar akun di server.',
        };
      }

      setUser(json.user);
      localStorage.setItem('asm_auth_user', JSON.stringify(json.user));
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Terjadi kesalahan jaringan saat mendaftarkan akun.',
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
      setUser(null);
      localStorage.removeItem('asm_auth_user');
    } finally {
      setIsLoading(false);
    }
  };

  const role = user?.role || 'customer';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        login,
        register,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
