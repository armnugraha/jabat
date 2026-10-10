'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../types';
import { supabase, isSupabaseConfigured } from '../supabase/client';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  role: UserRole;
  login: (emailOrPhone: string, password?: string, selectedRole?: UserRole) => Promise<{ success: boolean; error?: string; user?: UserProfile }>;
  register: (fullName: string, phone: string, email: string, password?: string) => Promise<{ success: boolean; error?: string; user?: UserProfile }>;
  updateUser: (updatedProfile: Partial<UserProfile>) => void;
  logout: () => Promise<void>;
  authFetch: (url: string, options?: RequestInit) => Promise<Response>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000; // 30 days (1 month)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const saveSession = (
    userProfile: UserProfile,
    session?: { access_token?: string; refresh_token?: string } | null
  ) => {
    setUser(userProfile);
    try {
      localStorage.setItem('asm_auth_user', JSON.stringify(userProfile));

      const accessToken = session?.access_token;
      const refreshToken = session?.refresh_token;

      if (accessToken) {
        setToken(accessToken);
        localStorage.setItem('asm_auth_token', accessToken);
      }
      if (refreshToken) {
        localStorage.setItem('asm_auth_refresh_token', refreshToken);
      }

      // Set 1-month expiration timestamp
      const sessionExpiresAt = Date.now() + ONE_MONTH_MS;
      localStorage.setItem('asm_auth_session_expires_at', sessionExpiresAt.toString());
    } catch (e) {
      console.warn('Error saving session to localStorage:', e);
    }
  };

  const updateUser = (updatedProfile: Partial<UserProfile>) => {
    setUser((prev) => {
      if (!prev) return null;
      const merged: UserProfile = { ...prev, ...updatedProfile };
      try {
        localStorage.setItem('asm_auth_user', JSON.stringify(merged));
      } catch (e) {
        console.warn('Error saving updated user to localStorage:', e);
      }
      return merged;
    });
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      // ignore
    } finally {
      setUser(null);
      setToken(null);
      try {
        localStorage.removeItem('asm_auth_user');
        localStorage.removeItem('asm_auth_token');
        localStorage.removeItem('asm_auth_refresh_token');
        localStorage.removeItem('asm_auth_session_expires_at');
      } catch (e) {}
      setIsLoading(false);
    }
  };

  const refreshSession = async (): Promise<string | null> => {
    try {
      if (typeof window === 'undefined') return null;

      const sessionExpiresAtStr = localStorage.getItem('asm_auth_session_expires_at');
      if (sessionExpiresAtStr) {
        const sessionExpiresAt = Number(sessionExpiresAtStr);
        if (Date.now() > sessionExpiresAt) {
          console.warn('1-month login session has expired. Logging out.');
          await logout();
          return null;
        }
      }

      const refreshToken = localStorage.getItem('asm_auth_refresh_token');
      if (!refreshToken) {
        return null;
      }

      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
        cache: 'no-store',
      });

      const json = await res.json();
      if (json.success && json.token) {
        setToken(json.token);
        localStorage.setItem('asm_auth_token', json.token);
        if (json.refreshToken) {
          localStorage.setItem('asm_auth_refresh_token', json.refreshToken);
        }
        return json.token;
      } else {
        console.warn('Failed to refresh token:', json.error);
        await logout();
        return null;
      }
    } catch (err) {
      console.error('Exception during refreshSession:', err);
      return null;
    }
  };

  const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
    let currentToken = token || (typeof window !== 'undefined' ? localStorage.getItem('asm_auth_token') : null);
    const headers = new Headers(options.headers || {});
    if (currentToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${currentToken}`);
    }

    try {
      let res = await fetch(url, { ...options, headers });
      if (res.status === 401) {
        const cloned = res.clone();
        try {
          const json = await cloned.json();
          if (
            json.error === 'jwt_expired' ||
            json.message?.toLowerCase().includes('jwt expired') ||
            json.error?.toLowerCase().includes('jwt expired') ||
            json.error?.toLowerCase().includes('session expired') ||
            json.error?.toLowerCase().includes('token expired')
          ) {
            console.log('JWT expired, attempting auto-refresh (1-month session)...');
            const newToken = await refreshSession();
            if (newToken) {
              // Retry original request with fresh access token
              headers.set('Authorization', `Bearer ${newToken}`);
              res = await fetch(url, { ...options, headers });
              return res;
            } else {
              if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/account')) {
                window.location.href = '/account';
              }
            }
          }
        } catch (e) {}
      }
      return res;
    } catch (err) {
      throw err;
    }
  };

  // Load and verify session on mount
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('asm_auth_user');
      const savedToken = localStorage.getItem('asm_auth_token');
      const sessionExpiresAtStr = localStorage.getItem('asm_auth_session_expires_at');

      // Check 1-month session validity
      if (sessionExpiresAtStr && Date.now() > Number(sessionExpiresAtStr)) {
        console.warn('Session is older than 1 month, clearing credentials.');
        logout();
        return;
      }

      if (savedToken) {
        setToken(savedToken);
      }
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);

        // Attempt background token refresh to ensure continuous session validity
        refreshSession().catch(() => {});

        // Refresh profile data from API
        if (parsed?.id) {
          authFetch(`/api/profile?userId=${parsed.id}`)
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

      saveSession(json.user, json.session);
      return { success: true, user: json.user };
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

      saveSession(json.user, json.session);
      return { success: true, user: json.user };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Terjadi kesalahan jaringan saat mendaftarkan akun.',
      };
    } finally {
      setIsLoading(false);
    }
  };

  const role = user?.role || 'customer';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        login,
        register,
        updateUser,
        logout,
        authFetch,
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

