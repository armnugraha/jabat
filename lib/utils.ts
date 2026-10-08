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
      return { label: 'Menunggu Pembayaran', color: 'bg-amber-50 text-amber-700 border-amber-200' };
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
