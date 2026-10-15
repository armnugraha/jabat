'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  Plus,
  Search,
  Edit,
  Trash2,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  X,
  Loader2,
  Phone,
  Mail,
  ArrowUpDown,
  Sparkles,
} from 'lucide-react';
import { UserAvatar } from '@/components/customer/UserAvatar';
import { UserRole } from '@/lib/types';

interface StaffMember {
  id: string;
  role: 'admin' | 'pharmacist' | 'customer';
  full_name: string;
  phone: string | null;
  email?: string | null;
  avatar_url?: string | null;
  sipa_number?: string | null;
  created_at: string;
  updated_at?: string;
}

const ROOT_ADMIN_ID = 'ef729fc0-54a1-4091-b083-51d1d0ce44b3';

export default function AdminStaffPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | 'admin' | 'pharmacist'>('all');
  const [copiedSipaId, setCopiedSipaId] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'pharmacist' as 'admin' | 'pharmacist',
    sipa_number: '',
    password: '',
  });

  const loadStaff = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/staff');
      const json = await res.json();
      if (json.success && json.data) {
        setStaffList(json.data);
      }
    } catch (err) {
      console.error('Failed fetching staff list:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const openAddModal = () => {
    setEditingStaff(null);
    setFormData({
      full_name: '',
      email: '',
      phone: '',
      role: 'pharmacist',
      sipa_number: '',
      password: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (staff: StaffMember) => {
    setEditingStaff(staff);
    setFormData({
      full_name: staff.full_name || '',
      email: staff.email || '',
      phone: staff.phone || '',
      role: staff.role === 'admin' ? 'admin' : 'pharmacist',
      sipa_number: staff.sipa_number || '',
      password: '',
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCopySipa = (id: string, sipa: string) => {
    navigator.clipboard.writeText(sipa);
    setCopiedSipaId(id);
    setTimeout(() => setCopiedSipaId(null), 2000);
  };

  const handleQuickToggleRole = async (staff: StaffMember) => {
    if (staff.id === ROOT_ADMIN_ID) {
      alert('Peran Administrator Utama sistem tidak dapat diubah.');
      return;
    }

    const nextRole: 'admin' | 'pharmacist' = staff.role === 'admin' ? 'pharmacist' : 'admin';
    const roleLabel = nextRole === 'admin' ? 'Administrator' : 'Apoteker Penanggung Jawab';

    if (
      !confirm(
        `Ubah hak akses "${staff.full_name}" menjadi ${roleLabel}?`
      )
    ) {
      return;
    }

    // If changing to pharmacist without SIPA, prompt or warn
    let targetSipa = staff.sipa_number;
    if (nextRole === 'pharmacist' && !targetSipa) {
      const inputSipa = prompt(
        'Masukkan nomor SIPA resmi untuk apoteker ini:',
        '19870412/SIPA-31.74/2021/2048'
      );
      if (!inputSipa) {
        alert('Pengubahan peran ke Apoteker dibatalkan karena nomor SIPA tidak diisi.');
        return;
      }
      targetSipa = inputSipa.trim();
    }

    // Optimistic UI update
    setStaffList((prev) =>
      prev.map((s) =>
        s.id === staff.id
          ? { ...s, role: nextRole, sipa_number: nextRole === 'admin' ? null : targetSipa }
          : s
      )
    );

    try {
      const res = await fetch(`/api/staff/${staff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: nextRole,
          sipa_number: nextRole === 'admin' ? null : targetSipa,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Gagal mengubah peran.');
      }
      showToast(`Peran berhasil diubah menjadi ${roleLabel}.`);
    } catch (err: any) {
      alert(err.message || 'Gagal memperbarui peran.');
      loadStaff(); // Rollback
    }
  };

  const handleDeleteStaff = async (staff: StaffMember) => {
    if (staff.id === ROOT_ADMIN_ID) {
      alert('Akun Administrator Utama sistem tidak boleh dihapus demi keamanan apotek.');
      return;
    }

    if (
      !confirm(
        `Yakin ingin menghapus akun ${staff.role === 'admin' ? 'Admin' : 'Apoteker'} "${staff.full_name}" dari sistem?`
      )
    ) {
      return;
    }

    // Optimistic update
    setStaffList((prev) => prev.filter((s) => s.id !== staff.id));

    try {
      const res = await fetch(`/api/staff/${staff.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Gagal menghapus akun staf.');
      }
      showToast('Akun staf berhasil dihapus.');
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus akun.');
      loadStaff(); // Rollback
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.full_name.trim()) {
      setFormError('Nama lengkap wajib diisi.');
      return;
    }

    if (!editingStaff && !formData.email.trim()) {
      setFormError('Alamat email wajib diisi untuk akun baru.');
      return;
    }

    if (formData.role === 'pharmacist' && !formData.sipa_number.trim()) {
      setFormError('Nomor SIPA wajib diisi untuk peran Apoteker Penanggung Jawab.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingStaff) {
        // Update existing staff
        const res = await fetch(`/api/staff/${editingStaff.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: formData.full_name.trim(),
            phone: formData.phone.trim(),
            role: formData.role,
            sipa_number: formData.role === 'pharmacist' ? formData.sipa_number.trim() : null,
          }),
        });
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || 'Gagal memperbarui data staf.');
        }

        setStaffList((prev) =>
          prev.map((s) =>
            s.id === editingStaff.id
              ? {
                  ...s,
                  full_name: formData.full_name.trim(),
                  phone: formData.phone.trim(),
                  role: formData.role,
                  sipa_number: formData.role === 'pharmacist' ? formData.sipa_number.trim() : null,
                }
              : s
          )
        );
        showToast('Data staf berhasil diperbarui.');
      } else {
        // Create new staff
        const res = await fetch('/api/staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || 'Gagal membuat akun staf baru.');
        }

        if (json.data) {
          setStaffList((prev) => [...prev, json.data]);
        } else {
          loadStaff();
        }
        showToast('Akun staf baru berhasil ditambahkan.');
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredStaff = staffList.filter((s) => {
    const matchRole =
      selectedRoleFilter === 'all' ? true : s.role === selectedRoleFilter;
    const query = searchQuery.toLowerCase();
    const matchQuery =
      s.full_name.toLowerCase().includes(query) ||
      (s.phone && s.phone.toLowerCase().includes(query)) ||
      (s.email && s.email.toLowerCase().includes(query)) ||
      (s.sipa_number && s.sipa_number.toLowerCase().includes(query));
    return matchRole && matchQuery;
  });

  const totalAdminCount = staffList.filter((s) => s.role === 'admin').length;
  const totalPharmacistCount = staffList.filter((s) => s.role === 'pharmacist').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Toast Alert */}
      {successToast && (
        <div className="fixed top-5 right-5 z-[9999] bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-3 duration-200">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header with Title & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">
            Kelola Admin & Apoteker
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen hak akses, akun administrator, staf farmasi, dan nomor SIPA apoteker penanggung jawab
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-600/25 transition active:scale-95 shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Staf Baru</span>
        </button>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-stitch flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Tim Staf
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">
              {staffList.length} <span className="text-xs font-normal text-slate-400">Pengelola</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-stitch flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Administrator
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">
              {totalAdminCount} <span className="text-xs font-normal text-slate-400">Akses Penuh</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-stitch flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Apoteker PJ
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-0.5">
              {totalPharmacistCount} <span className="text-xs font-normal text-slate-400">Berlisensi SIPA</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-stitch flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama staf, nomor WhatsApp, nomor SIPA..."
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2.5 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto bg-slate-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setSelectedRoleFilter('all')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              selectedRoleFilter === 'all'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Semua ({staffList.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedRoleFilter('admin')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              selectedRoleFilter === 'admin'
                ? 'bg-white text-indigo-700 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Admin ({totalAdminCount})
          </button>
          <button
            type="button"
            onClick={() => setSelectedRoleFilter('pharmacist')}
            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              selectedRoleFilter === 'pharmacist'
                ? 'bg-white text-emerald-700 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Apoteker ({totalPharmacistCount})
          </button>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-white rounded-3xl border border-slate-200/80 shadow-stitch overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
            <span className="text-xs font-medium">Memuat data staf & apoteker...</span>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Tidak ada staf ditemukan sesuai pencarian.
          </div>
        ) : (
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Nama Staf & Foto</th>
                <th className="py-3.5 px-4">Peran & Hak Akses</th>
                <th className="py-3.5 px-4">Nomor SIPA Resmi</th>
                <th className="py-3.5 px-4">Kontak (WhatsApp & Email)</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.map((staff) => {
                const isRoot = staff.id === ROOT_ADMIN_ID;
                const isPharmacist = staff.role === 'pharmacist';

                return (
                  <tr key={staff.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          name={staff.full_name}
                          avatarUrl={staff.avatar_url}
                          role={staff.role as UserRole}
                          size="md"
                        />
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{staff.full_name}</span>
                            {isRoot && (
                              <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-extrabold uppercase">
                                Super Admin
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            ID: {staff.id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        {isPharmacist ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                            Apoteker PJ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10px] font-bold">
                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                            Administrator
                          </span>
                        )}

                        {!isRoot && (
                          <button
                            type="button"
                            onClick={() => handleQuickToggleRole(staff)}
                            className="p-1 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition"
                            title={`Ganti peran ke ${isPharmacist ? 'Admin' : 'Apoteker'}`}
                          >
                            <ArrowUpDown className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {isPharmacist ? (
                        staff.sipa_number ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-800">
                            <span>{staff.sipa_number}</span>
                            <button
                              type="button"
                              onClick={() => handleCopySipa(staff.id, staff.sipa_number!)}
                              className="text-slate-400 hover:text-sky-600 transition"
                              title="Salin Nomor SIPA"
                            >
                              {copiedSipaId === staff.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold">
                            <AlertCircle className="w-3 h-3 text-amber-500" />
                            SIPA Belum Diisi
                          </span>
                        )
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">
                          Akses Manajemen Sistem
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="font-mono text-[11px] text-slate-800 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{staff.phone || 'Belum diatur'}</span>
                        </div>
                        {staff.email && (
                          <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span>{staff.email}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(staff)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition"
                          title="Edit Data Staf"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {!isRoot && (
                          <button
                            type="button"
                            onClick={() => handleDeleteStaff(staff)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Hapus Staf"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile Cards View */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
            <span className="text-xs">Memuat data staf...</span>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 text-center text-slate-400 text-xs">
            Tidak ada staf ditemukan.
          </div>
        ) : (
          filteredStaff.map((staff) => {
            const isRoot = staff.id === ROOT_ADMIN_ID;
            const isPharmacist = staff.role === 'pharmacist';

            return (
              <div
                key={staff.id}
                className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-stitch space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar
                      name={staff.full_name}
                      avatarUrl={staff.avatar_url}
                      role={staff.role as UserRole}
                      size="md"
                    />
                    <div>
                      <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <span>{staff.full_name}</span>
                        {isRoot && (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-extrabold uppercase">
                            Super Admin
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        {isPharmacist ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-bold">
                            <Sparkles className="w-3 h-3 text-emerald-600" />
                            Apoteker PJ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-[9px] font-bold">
                            <ShieldCheck className="w-3 h-3 text-indigo-600" />
                            Administrator
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(staff)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition"
                      title="Edit Staf"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {!isRoot && (
                      <button
                        type="button"
                        onClick={() => handleDeleteStaff(staff)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Hapus Staf"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                  {isPharmacist && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">No. SIPA:</span>
                      {staff.sipa_number ? (
                        <span className="font-mono text-[11px] font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-200">
                          {staff.sipa_number}
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-600 font-semibold">
                          Belum diisi
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">No. Telepon:</span>
                    <span className="font-mono text-slate-800">{staff.phone || '-'}</span>
                  </div>

                  {staff.email && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-[11px]">Email:</span>
                      <span className="font-mono text-slate-800 text-[11px] truncate max-w-[200px]">
                        {staff.email}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    {editingStaff ? 'Edit Data Staf & Apoteker' : 'Tambah Akun Staf / Apoteker'}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {editingStaff ? 'Perbarui informasi profil dan nomor lisensi SIPA' : 'Buat akun pengelola apotek atau apoteker penanggung jawab baru'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Role Selection */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Pilih Peran & Tanggung Jawab Akun:
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, role: 'pharmacist' }))}
                    className={`p-3 rounded-2xl text-left border transition ${
                      formData.role === 'pharmacist'
                        ? 'border-emerald-600 bg-emerald-50/60 text-emerald-950 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      <span>Apoteker PJ</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                      Verifikasi resep dokter, meja chat konsultasi pasien, dan lisensi SIPA.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, role: 'admin' }))}
                    className={`p-3 rounded-2xl text-left border transition ${
                      formData.role === 'admin'
                        ? 'border-indigo-600 bg-indigo-50/60 text-indigo-950 shadow-2xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-xs">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      <span>Administrator</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                      Akses penuh katalog obat, stok, pengaturan apotek, dan laporan penjualan.
                    </p>
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nama Lengkap & Gelar:
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, full_name: e.target.value }))}
                  placeholder={formData.role === 'pharmacist' ? 'apt. Siti Rahma, S.Farm.' : 'Budi Santoso'}
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              {/* SIPA Number (Only when role is pharmacist) */}
              {formData.role === 'pharmacist' && (
                <div className="p-3 rounded-2xl bg-emerald-50/40 border border-emerald-200/80 space-y-1">
                  <label className="text-xs font-bold text-emerald-950 flex items-center justify-between">
                    <span>Nomor SIPA Resmi Kemenkes RI:</span>
                    <span className="text-[10px] font-normal text-emerald-700">*Wajib untuk Apoteker</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.sipa_number}
                    onChange={(e) => setFormData((prev) => ({ ...prev, sipa_number: e.target.value }))}
                    placeholder="Contoh: 19870412/SIPA-31.74/2021/2048"
                    className="w-full bg-white border border-emerald-300 rounded-xl py-2 px-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-emerald-700">
                    Nomor ini akan dicantumkan secara resmi di ruang konsultasi chat pasien dan verifikasi resep.
                  </p>
                </div>
              )}

              {/* Phone */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nomor Telepon / WhatsApp:
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="0812-3456-7890"
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl py-2 px-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Alamat Email:
                </label>
                <input
                  type="email"
                  required={!editingStaff}
                  disabled={!!editingStaff}
                  value={formData.email}
                  onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="apoteker@jabat.id"
                  className="w-full bg-slate-50 disabled:bg-slate-100 disabled:text-slate-500 border border-slate-300 rounded-2xl py-2 px-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              {/* Password */}
              {!editingStaff && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Kata Sandi Akun:
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="Minimal 6 karakter (default: Password123!)"
                    className="w-full bg-slate-50 border border-slate-300 rounded-2xl py-2 px-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Jika dikosongkan, kata sandi awal akan disetel ke: <code>Password123!</code>
                  </p>
                </div>
              )}

              {/* Form Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-2xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-2xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition active:scale-95"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>{editingStaff ? 'Simpan Perubahan' : 'Tambahkan Akun'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
