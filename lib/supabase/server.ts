import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
  global: {
    fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }),
  },
});

let cachedAdminToken: string | null = null;
let tokenExpiresAt: number = 0;

/**
 * Server-side Admin Client: Authenticated as admin@jabat.id (or service role).
 * This client ALWAYS has elevated privileges and never uses arbitrary user tokens.
 */
export async function getSupabaseAdminClient(_request?: any): Promise<SupabaseClient> {
  // 1. If valid service role key is configured, use it directly (bypasses RLS completely)
  if (serviceRoleKey && serviceRoleKey !== 'your-supabase-service-role-key' && serviceRoleKey.length > 20) {
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
      global: {
        fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }),
      },
    });
  }

  // 2. Authenticate with admin credentials to gain admin RLS write privileges
  const now = Date.now();
  if (!cachedAdminToken || now >= tokenExpiresAt) {
    try {
      const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          apikey: supabaseAnonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'admin@jabat.id',
          password: 'Password123!',
        }),
        cache: 'no-store',
      });

      if (res.ok) {
        const json = await res.json();
        if (json.access_token) {
          cachedAdminToken = json.access_token;
          const expiresInSec = json.expires_in || 3600;
          tokenExpiresAt = now + (expiresInSec - 120) * 1000;
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn('Admin token fetch failed:', res.status, errJson);
        cachedAdminToken = null;
      }
    } catch (e) {
      console.warn('Admin token generation exception:', e);
      cachedAdminToken = null;
    }
  }

  if (cachedAdminToken) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: {
        headers: { Authorization: `Bearer ${cachedAdminToken}` },
        fetch: (url, init) => fetch(url, { ...init, cache: 'no-store' }),
      },
    });
  }

  // Fallback to anonymous client
  return supabaseAnon;
}

/**
 * User Client: Authenticated using the client's Bearer token from Request headers.
 */
export function getSupabaseClientFromRequest(request?: Request): { client: SupabaseClient; token: string | null } {
  if (request) {
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token && token !== 'null' && token !== 'undefined') {
        const client = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        return { client, token };
      }
    }
  }

  return { client: supabaseAnon, token: null };
}

export function isJwtExpiredError(error: any): boolean {
  if (!error) return false;
  const msg = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
  return (
    msg.toLowerCase().includes('jwt expired') ||
    msg.toLowerCase().includes('token expired') ||
    msg.toLowerCase().includes('invalid jwt') ||
    error.status === 401 ||
    error.code === '401' ||
    error.code === 'PGRST301'
  );
}
