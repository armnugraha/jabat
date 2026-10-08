'use client';

import React, { useState, useEffect } from 'react';
import { Users, Phone, MapPin, ShoppingBag, DollarSign, Loader2 } from 'lucide-react';
import { formatRupiah } from '@/lib/utils';
import { UserAvatar } from '@/components/customer/UserAvatar';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/customers')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setCustomers(json.data);
        }
      })
      .catch((err) => console.error('Failed to fetch customers:', err))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <div>
        <h2 className="text-lg font-extrabold text-slate-900">
          Database Pelanggan Apotek
        </h2>
        <p className="text-xs text-slate-500">
          Daftar riwayat pasien dan akumulasi transaksi belanja obat dari database
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-stitch overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
            <span className="text-xs font-medium">Memuat data pelanggan dari Supabase...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Belum ada pelanggan terdaftar di database.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                <tr>
                  <th className="py-3.5 px-4">Nama Pelanggan</th>
                  <th className="py-3.5 px-4">Kontak & Email</th>
                  <th className="py-3.5 px-4 text-center">Total Pesanan</th>
                  <th className="py-3.5 px-4 text-right">Total Transaksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar name={c.name} avatarUrl={c.avatar_url} size="sm" />
                        <div>
                          <div className="font-bold text-slate-900">{c.name}</div>
                          <div className="text-[10px] text-slate-400">
                            Terakhir aktif: {c.lastOrder}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-[11px] text-slate-800">
                        {c.phone}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-xs font-mono">
                        {c.email || 'Email tidak disetel'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold">
                      {c.ordersCount}x Pesanan
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-sky-700">
                      {formatRupiah(c.totalSpend)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
