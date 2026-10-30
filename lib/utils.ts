import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace('Rp', 'Rp ');
}

export function formatShortRupiah(amount: number): string {
  if (amount >= 1000000) {
    return `Rp ${(amount / 1000000).toFixed(1)}jt`;
  }
  if (amount >= 1000) {
    return `Rp ${(amount / 1000).toFixed(0)}rb`;
  }
  return `Rp ${amount}`;
}

export function getOrderStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return { label: 'Menunggu Konfirmasi', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'waiting_prescription':
      return { label: 'Menunggu Upload Resep', color: 'bg-purple-50 text-purple-700 border-purple-200' };
    case 'prescription_review':
      return { label: 'Verifikasi Resep Apoteker', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    case 'confirmed':
      return { label: 'Dikonfirmasi', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'preparing':
      return { label: 'Sedang Disiapkan Apotek', color: 'bg-sky-50 text-sky-700 border-sky-200' };
    case 'out_for_delivery':
      return { label: 'Sedang Diantar Kurir', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    case 'completed':
      return { label: 'Selesai', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    case 'cancelled':
      return { label: 'Dibatalkan', color: 'bg-rose-50 text-rose-700 border-rose-200' };
    default:
      return { label: status, color: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
}

export function getPaymentStatusBadge(status?: string) {
  switch (status) {
    case 'waiting_confirmation':
      return { label: 'Sedang Dikonfirmasi', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'paid':
      return { label: 'Lunas', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'pending':
      return { label: 'Belum Dibayar', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    case 'failed':
      return { label: 'Gagal', color: 'bg-rose-50 text-rose-700 border-rose-200' };
    case 'cancelled':
      return { label: 'Dibatalkan', color: 'bg-rose-50 text-rose-700 border-rose-200' };
    default:
      return { label: status || 'Belum Dibayar', color: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
}

export function isStoreOpenNow(store?: { is_open?: boolean; opening_time?: string; closing_time?: string }): {
  isOpen: boolean;
  statusText: string;
} {
  if (!store || store.is_open === false) {
    return { isOpen: false, statusText: 'Tutup' };
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const parseTime = (timeStr?: string, defaultVal = 0) => {
    if (!timeStr) return defaultVal;
    const parts = timeStr.replace('.', ':').split(':').map((n) => parseInt(n, 10));
    if (isNaN(parts[0])) return defaultVal;
    return parts[0] * 60 + (parts[1] || 0);
  };

  const openMinutes = parseTime(store.opening_time, 8 * 60);
  const closeMinutes = parseTime(store.closing_time, 21 * 60);

  let isOpen = false;
  if (closeMinutes > openMinutes) {
    // Normal daytime e.g. 08:00 - 21:00
    isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  } else {
    // Overnight e.g. 20:00 - 06:00
    isOpen = currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }

  const formattedClose = store.closing_time ? store.closing_time.replace(':', '.') : '21.00';
  const formattedOpen = store.opening_time ? store.opening_time.replace(':', '.') : '08.00';

  return {
    isOpen,
    statusText: isOpen ? `Buka • Tutup ${formattedClose}` : `Tutup • Buka ${formattedOpen}`,
  };
}

export function formatChatTime(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  } catch {
    return dateStr;
  }
}

export type LicenseType = 'SIPA' | 'STR' | 'Asnakes' | '';

export interface ParsedLicense {
  type: LicenseType;
  id: string;
  hasLicense: boolean;
  displayText: string;
  label: string;
}

export function parsePharmacistLicense(value?: string | null): ParsedLicense {
  if (!value || typeof value !== 'string' || !value.trim() || value.trim() === '-') {
    return {
      type: '',
      id: '',
      hasLicense: false,
      displayText: '',
      label: 'Izin Praktik',
    };
  }

  const clean = value.trim();

  // Pattern 1: Explicit prefix like "SIPA: 123", "STR: 123", "Asnakes: 123"
  const prefixMatch = clean.match(/^(SIPA|STR|Asnakes)\s*[:\-]\s*(.*)$/i);
  if (prefixMatch) {
    const rawType = prefixMatch[1].toUpperCase();
    const type: LicenseType = rawType === 'ASNAKES' ? 'Asnakes' : (rawType as 'SIPA' | 'STR');
    const id = prefixMatch[2].trim();
    return {
      type,
      id,
      hasLicense: !!id,
      displayText: id ? `${type}: ${id}` : type,
      label: type,
    };
  }

  // Pattern 2: Contains STR (e.g. STRA, STRTTK, or /STR-)
  if (/\bstr\b/i.test(clean) || /\/str/i.test(clean) || /-str/i.test(clean)) {
    return {
      type: 'STR',
      id: clean,
      hasLicense: true,
      displayText: `STR: ${clean}`,
      label: 'STR',
    };
  }

  // Pattern 3: Contains Asnakes
  if (/asnakes/i.test(clean)) {
    return {
      type: 'Asnakes',
      id: clean,
      hasLicense: true,
      displayText: `Asnakes: ${clean}`,
      label: 'Asnakes',
    };
  }

  // Pattern 4: Contains SIPA
  if (/sipa/i.test(clean)) {
    return {
      type: 'SIPA',
      id: clean,
      hasLicense: true,
      displayText: clean.toUpperCase().startsWith('SIPA') ? clean : `SIPA: ${clean}`,
      label: 'SIPA',
    };
  }

  // Fallback: If non-empty but without specific prefix, treat as SIPA default
  return {
    type: 'SIPA',
    id: clean,
    displayText: `SIPA: ${clean}`,
    label: 'SIPA',
    hasLicense: true,
  };
}

export function formatPharmacistLicense(type: LicenseType, id: string): string {
  let cleanId = id.trim();
  if (!cleanId) return '';
  if (!type) return cleanId;
  const redundantPrefixRegex = new RegExp(`^${type}\\s*[:\\-]\\s*`, 'i');
  cleanId = cleanId.replace(redundantPrefixRegex, '').trim();
  if (!cleanId) return '';
  return `${type}: ${cleanId}`;
}

export function isValidUUID(val: any): boolean {
  return (
    typeof val === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
  );
}


