'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  ShoppingBag,
  Loader2,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  X,
  Eye,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  Download,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Building,
  User,
  Phone,
  MapPin,
  Tag,
  AlertTriangle,
} from 'lucide-react';
import { formatRupiah, getOrderStatusBadge, getPaymentStatusBadge } from '@/lib/utils';
import { Order, Product, StoreSettings } from '@/lib/types';
import {
  formatDate,
  formatSimpleDate,
  exportInvoicesToExcel,
  exportSingleInvoiceToExcel,
  exportInvoicesToPDF,
  exportSingleInvoiceToPDF,
} from '@/lib/export-invoices';

export default function AdminReportsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'cancelled' | 'in_progress'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | '7days' | '30days' | 'this_month'>('all');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'qris' | 'bank_transfer' | 'cod'>('all');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Invoice Detail Modal state
  const [selectedInvoice, setSelectedInvoice] = useState<Order | null>(null);

  // Export loading indicators
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/orders?role=admin', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/products', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/store', { cache: 'no-store' }).then((r) => r.json()),
    ])
      .then(([ordersJson, productsJson, storeJson]) => {
        if (ordersJson.success && ordersJson.data) setOrders(ordersJson.data);
        if (productsJson.success && productsJson.data) setProducts(productsJson.data);
        if (storeJson.success && storeJson.data) setStoreSettings(storeJson.data);
      })
      .catch((err) => console.error('Failed to load report data:', err))
      .finally(() => setIsLoading(false));
  }, []);

  // Top KPI metrics
  const totalRevenue = useMemo(() => {
    return orders
      .filter((o) => o.status !== 'cancelled' && o.payment_status === 'paid')
      .reduce((sum, o) => sum + Number(o.total || 0), 0);
  }, [orders]);

  const completedOrders = useMemo(() => {
    return orders.filter(
      (o) => o.status !== 'cancelled' && (o.status === 'completed' || o.payment_status === 'paid')
    );
  }, [orders]);

  const avgOrderValue = completedOrders.length > 0 ? Math.round(totalRevenue / completedOrders.length) : 0;

  const totalCancelledCount = useMemo(() => {
    return orders.filter((o) => o.status === 'cancelled' || o.payment_status === 'cancelled').length;
  }, [orders]);

  // Filtering invoices logic
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      // 1. Status Filter
      const isCancelled = ord.status === 'cancelled' || ord.payment_status === 'cancelled';
      const isSuccess = !isCancelled && (ord.status === 'completed' || ord.payment_status === 'paid');
      const isInProgress = !isCancelled && !isSuccess;

      if (statusFilter === 'success' && !isSuccess) return false;
      if (statusFilter === 'cancelled' && !isCancelled) return false;
      if (statusFilter === 'in_progress' && !isInProgress) return false;

      // 2. Payment Method Filter
      if (paymentFilter !== 'all' && ord.payment_method !== paymentFilter) return false;

      // 3. Date Filter
      if (dateFilter !== 'all' && ord.created_at) {
        const orderDate = new Date(ord.created_at);
        const now = new Date();

        if (dateFilter === 'today') {
          const isToday =
            orderDate.getDate() === now.getDate() &&
            orderDate.getMonth() === now.getMonth() &&
            orderDate.getFullYear() === now.getFullYear();
          if (!isToday) return false;
        } else if (dateFilter === '7days') {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(now.getDate() - 7);
          if (orderDate < sevenDaysAgo) return false;
        } else if (dateFilter === '30days') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(now.getDate() - 30);
          if (orderDate < thirtyDaysAgo) return false;
        } else if (dateFilter === 'this_month') {
          const isThisMonth =
            orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
          if (!isThisMonth) return false;
        }
      }

      // 4. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const addr = ord.delivery_address && typeof ord.delivery_address === 'object' ? ord.delivery_address : null;
        const custName = (ord.customer_name || addr?.recipient_name || '').toLowerCase();
        const custPhone = (ord.customer_phone || addr?.phone || '').toLowerCase();
        const orderNum = (ord.order_number || '').toLowerCase();
        const itemNames = (ord.items || []).map((it) => it.product_name_snapshot?.toLowerCase() || '').join(' ');

        const match =
          orderNum.includes(q) ||
          custName.includes(q) ||
          custPhone.includes(q) ||
          itemNames.includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [orders, statusFilter, paymentFilter, dateFilter, searchQuery]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, dateFilter, paymentFilter]);

  // Paginated data
  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  // Filtered totals
  const filteredTotalRevenue = useMemo(() => {
    return filteredOrders
      .filter((o) => o.status !== 'cancelled' && o.payment_status === 'paid')
      .reduce((sum, o) => sum + Number(o.total || 0), 0);
  }, [filteredOrders]);

  const filteredCancelledCount = useMemo(() => {
    return filteredOrders.filter((o) => o.status === 'cancelled' || o.payment_status === 'cancelled').length;
  }, [filteredOrders]);

  // Bulk Export Handlers
  const handleBulkExportExcel = () => {
    try {
      setIsExportingExcel(true);
      const filterLabel =
        statusFilter === 'success'
          ? 'Berhasil'
          : statusFilter === 'cancelled'
          ? 'Dibatalkan'
          : statusFilter === 'in_progress'
          ? 'Dalam_Proses'
          : 'Semua';
      const filename = `Laporan_Invoice_${filterLabel}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      exportInvoicesToExcel(filteredOrders, storeSettings, filename);
    } catch (err) {
      console.error('Failed to export bulk Excel:', err);
      alert('Gagal mengekspor Excel.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleBulkExportPDF = () => {
    try {
      setIsExportingPDF(true);
      const filterDesc = `Status: ${
        statusFilter === 'all'
          ? 'Semua Status'
          : statusFilter === 'success'
          ? 'Berhasil / Lunas'
          : statusFilter === 'cancelled'
          ? 'Dibatalkan'
          : 'Dalam Proses'
      } | Periode: ${
        dateFilter === 'all'
          ? 'Semua Waktu'
          : dateFilter === 'today'
          ? 'Hari Ini'
          : dateFilter === '7days'
          ? '7 Hari Terakhir'
          : dateFilter === '30days'
          ? '30 Hari Terakhir'
          : 'Bulan Ini'
      }`;
      exportInvoicesToPDF(filteredOrders, storeSettings, filterDesc);
    } catch (err) {
      console.error('Failed to export bulk PDF:', err);
      alert('Gagal mengekspor PDF.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Helper customer info
  const getCustomerInfo = (ord: Order) => {
    const addr = ord.delivery_address && typeof ord.delivery_address === 'object' ? ord.delivery_address : null;
    const name = ord.customer_name?.trim() || addr?.recipient_name?.trim() || 'Pelanggan Apotek';
    const phone = ord.customer_phone?.trim() || addr?.phone?.trim() || '-';
    return { name, phone, address: addr?.address_line || '-' };
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sky-600" />
            <span>Laporan Penjualan & Invoice Farmasi</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ringkasan omset penjualan, status pembayaran, dan manajemen seluruh faktur pesanan apotek
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-400 bg-white rounded-3xl border border-slate-200/80">
          <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
          <span className="text-xs">Menghitung laporan penjualan dari database...</span>
        </div>
      ) : (
        <>
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-stitch">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-2">
                <span>Total Omzet Penjualan (Lunas)</span>
                <DollarSign className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900">
                {formatRupiah(totalRevenue)}
              </div>
              <span className="text-xs text-emerald-600 font-bold mt-1 inline-block">
                Hanya menghitung transaksi lunas & tidak dibatalkan
              </span>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-stitch">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-2">
                <span>Total Faktur Berhasil</span>
                <ShoppingBag className="w-4 h-4 text-sky-600" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900">
                {completedOrders.length} Pesanan
              </div>
              <span className="text-xs text-slate-500 font-medium mt-1 inline-block">
                {orders.length} total pesanan masuk tercatat
              </span>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-stitch">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold mb-2">
                <span>Faktur Dibatalkan</span>
                <XCircle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl font-extrabold text-slate-900">
                {totalCancelledCount} Pesanan
              </div>
              <span className="text-xs text-rose-600 font-bold mt-1 inline-block">
                Stok aman & tidak masuk omzet
              </span>
            </div>
          </div>

          {/* ============================================================== */}
          {/* NEW INVOICE LIST CARD WITH COMPREHENSIVE FILTERS & EXPORTS */}
          {/* ============================================================== */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-stitch space-y-5">
            {/* Card Header & Bulk Export Buttons */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 font-bold text-[10px] uppercase tracking-wider border border-sky-200/80">
                    Faktur Digital Apotek
                  </span>
                  <span className="text-slate-400 text-xs">•</span>
                  <span className="text-xs font-bold text-slate-600">
                    {filteredOrders.length} Faktur Ditemukan
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mt-1">
                  Daftar Faktur & Invoice Transaksi
                </h3>
                <p className="text-xs text-slate-500">
                  Data seluruh invoice baik yang berhasil, dalam proses, maupun yang dibatalkan
                </p>
              </div>

              {/* Bulk Export Buttons (All Filtered Data) */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleBulkExportExcel}
                  disabled={isExportingExcel || filteredOrders.length === 0}
                  className="px-3.5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition active:scale-95 flex items-center gap-2"
                  title="Unduh seluruh faktur terfilter dalam format Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{isExportingExcel ? 'Mengekspor...' : 'Export Semua (XLSX)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleBulkExportPDF}
                  disabled={isExportingPDF || filteredOrders.length === 0}
                  className="px-3.5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition active:scale-95 flex items-center gap-2"
                  title="Unduh laporan tabel faktur terfilter dalam format PDF (.pdf)"
                >
                  <FileText className="w-4 h-4" />
                  <span>{isExportingPDF ? 'Mengekspor...' : 'Export Semua (PDF)'}</span>
                </button>
              </div>
            </div>

            {/* Filters Row: Search, Status, Period, Payment Method */}
            <div className="space-y-3">
              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nomor invoice (ASM-...), nama pelanggan, no telepon, atau nama obat..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Row Selectors */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Status Filter Tabs */}
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
                  {[
                    { id: 'all', label: 'Semua Status' },
                    { id: 'success', label: 'Berhasil / Lunas' },
                    { id: 'cancelled', label: 'Dibatalkan' },
                    { id: 'in_progress', label: 'Dalam Proses' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setStatusFilter(tab.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                        statusFilter === tab.id
                          ? tab.id === 'cancelled'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : tab.id === 'success'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Period Filter */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-2xl">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value as any)}
                    className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="all">Semua Waktu</option>
                    <option value="today">Hari Ini</option>
                    <option value="7days">7 Hari Terakhir</option>
                    <option value="30days">30 Hari Terakhir</option>
                    <option value="this_month">Bulan Ini</option>
                  </select>
                </div>

                {/* Payment Method Filter */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-2xl">
                  <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value as any)}
                    className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="all">Semua Metode</option>
                    <option value="qris">QRIS Digital</option>
                    <option value="bank_transfer">Transfer Bank</option>
                    <option value="cod">COD (Bayar di Tempat)</option>
                  </select>
                </div>

                {/* Reset filters button if active */}
                {(statusFilter !== 'all' || dateFilter !== 'all' || paymentFilter !== 'all' || searchQuery) && (
                  <button
                    onClick={() => {
                      setStatusFilter('all');
                      setDateFilter('all');
                      setPaymentFilter('all');
                      setSearchQuery('');
                    }}
                    className="text-xs font-bold text-slate-500 hover:text-rose-600 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 transition flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    <span>Reset Filter</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filter Result Summary Strip */}
            <div className="bg-slate-50 rounded-2xl px-4 py-2.5 border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="text-slate-600 font-medium">
                Menampilkan <strong className="text-slate-900">{filteredOrders.length}</strong> faktur terfilter
              </div>
              <div className="flex items-center gap-4 text-xs font-bold">
                <span className="text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Omzet Berhasil: {formatRupiah(filteredTotalRevenue)}
                </span>
                {filteredCancelledCount > 0 && (
                  <span className="text-rose-700 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" />
                    Dibatalkan: {filteredCancelledCount} pesanan
                  </span>
                )}
              </div>
            </div>

            {/* Invoice Table */}
            {filteredOrders.length === 0 ? (
              <div className="py-14 text-center text-slate-400 text-xs bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-600">Tidak ada faktur yang cocok dengan filter.</p>
                <p className="text-[11px] text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau reset filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-100/80 text-[11px] uppercase tracking-wider font-extrabold text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-3.5">No. Invoice & Tanggal</th>
                      <th className="py-3 px-3.5">Pelanggan</th>
                      <th className="py-3 px-3.5">Status Pesanan</th>
                      <th className="py-3 px-3.5">Status Pembayaran</th>
                      <th className="py-3 px-3.5">Item Obat</th>
                      <th className="py-3 px-3.5 text-right">Total Nilai</th>
                      <th className="py-3 px-3.5 text-center">Aksi Dokumen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedOrders.map((ord) => {
                      const cust = getCustomerInfo(ord);
                      const isCancelled = ord.status === 'cancelled' || ord.payment_status === 'cancelled';
                      const isPaid = !isCancelled && ord.payment_status === 'paid';
                      const orderBadge = getOrderStatusBadge(ord.status);
                      const paymentBadge = getPaymentStatusBadge(ord.payment_status);
                      const totalItemsCount = (ord.items || []).reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);

                      return (
                        <tr
                          key={ord.id}
                          className={`hover:bg-slate-50/80 transition ${
                            isCancelled ? 'bg-rose-50/30' : ''
                          }`}
                        >
                          {/* Invoice Number & Date */}
                          <td className="py-3 px-3.5 align-middle">
                            <span className="font-mono font-extrabold text-slate-900 block">
                              {ord.order_number}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {formatDate(ord.created_at)}
                            </span>
                          </td>

                          {/* Customer */}
                          <td className="py-3 px-3.5 align-middle">
                            <span className="font-bold text-slate-900 block truncate max-w-[150px]">
                              {cust.name}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {cust.phone}
                            </span>
                          </td>

                          {/* Order Status */}
                          <td className="py-3 px-3.5 align-middle">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${orderBadge.color}`}
                            >
                              {isCancelled ? (
                                <XCircle className="w-3 h-3 text-rose-600" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              )}
                              <span>{orderBadge.label}</span>
                            </span>
                          </td>

                          {/* Payment Status */}
                          <td className="py-3 px-3.5 align-middle">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${paymentBadge.color}`}
                            >
                              {paymentBadge.label}
                            </span>
                            <span className="text-[10px] text-slate-400 block mt-0.5 uppercase">
                              {ord.payment_method || 'QRIS'}
                            </span>
                          </td>

                          {/* Items Count & Preview */}
                          <td className="py-3 px-3.5 align-middle">
                            <span className="font-bold text-slate-800 block">
                              {totalItemsCount} item
                            </span>
                            <span className="text-[10px] text-slate-400 truncate block max-w-[140px]">
                              {ord.items?.[0]?.product_name_snapshot || 'Obat Farmasi'}
                              {ord.items && ord.items.length > 1 && ` (+${ord.items.length - 1} lainnya)`}
                            </span>
                          </td>

                          {/* Total Value */}
                          <td className="py-3 px-3.5 text-right align-middle">
                            <span
                              className={`font-extrabold text-sm block ${
                                isCancelled ? 'text-slate-400 line-through' : 'text-slate-900'
                              }`}
                            >
                              {formatRupiah(ord.total)}
                            </span>
                            {isCancelled && (
                              <span className="text-[10px] text-rose-600 font-bold block">
                                Tidak Dihitung
                              </span>
                            )}
                          </td>

                          {/* Actions: View, Single XLSX, Single PDF */}
                          <td className="py-3 px-3.5 text-center align-middle">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* View Invoice Modal */}
                              <button
                                type="button"
                                onClick={() => setSelectedInvoice(ord)}
                                className="p-1.5 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-800 border border-sky-200/80 transition"
                                title="Lihat Tampilan Faktur / Invoice Lengkap"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>

                              {/* Single XLSX Export */}
                              <button
                                type="button"
                                onClick={() => exportSingleInvoiceToExcel(ord, storeSettings)}
                                className="p-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border border-emerald-200/80 transition"
                                title="Download Excel Faktur Ini (.xlsx)"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                              </button>

                              {/* Single PDF Export */}
                              <button
                                type="button"
                                onClick={() => exportSingleInvoiceToPDF(ord, storeSettings)}
                                className="p-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 border border-rose-200/80 transition"
                                title="Download PDF Faktur Ini (.pdf)"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {filteredOrders.length > pageSize && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs">
                <span className="text-slate-500">
                  Menampilkan {(currentPage - 1) * pageSize + 1} –{' '}
                  {Math.min(currentPage * pageSize, filteredOrders.length)} dari {filteredOrders.length} faktur
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="px-3 py-1 bg-slate-100 rounded-xl font-bold text-slate-800 text-xs">
                    Halaman {currentPage} dari {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Catalog / Best Selling Medicines */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-stitch space-y-4">
            <h3 className="text-xs font-bold text-slate-900 pb-2 border-b border-slate-100 flex items-center gap-2">
              <Package className="w-4 h-4 text-sky-600" />
              <span>Katalog Obat & Produk Apotek</span>
            </h3>

            {products.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Belum ada data produk di database.
              </div>
            ) : (
              <div className="space-y-3">
                {products.slice(0, 6).map((p, idx) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-800 font-extrabold flex items-center justify-center text-xs">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-900">{p.name}</h4>
                        <p className="text-[10px] text-slate-500">
                          {p.requires_prescription ? 'Wajib Resep Dokter' : 'Obat Bebas'} • {p.manufacturer || 'Kimia Farma'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-slate-800 block">
                        Stok: {p.variants?.[0]?.stock || 0} unit
                      </span>
                      <span className="text-[11px] font-extrabold text-sky-700">
                        {formatRupiah(p.variants?.[0]?.price || 0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ============================================================== */}
      {/* MODAL LIHAT DETAIL INVOICE & CETAK / EXPORT SINGLE INVOICE */}
      {/* ============================================================== */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Top Actions */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-sky-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Faktur Penjualan Apotek
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Invoice Printable View */}
            <div id="printable-invoice" className="border border-slate-200 rounded-2xl p-5 bg-white space-y-4">
              {/* Kop Apotek & Status Stamp */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <h4 className="text-lg font-black text-sky-700 uppercase tracking-tight">
                    {storeSettings?.store_name || 'Apotek Jabat'}
                  </h4>
                  <p className="text-xs text-slate-600 font-medium mt-0.5">
                    Cabang {storeSettings?.branch_name || 'Bandung'} • Farmasi Digital
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {storeSettings?.address || 'Jl. Raya Apotek No. 42'} • Telp: {storeSettings?.phone || '0812-3456-7890'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Apoteker PJ: <strong>{storeSettings?.pharmacist_name || 'apt. Siti Rahma, S.Farm.'}</strong> (SIPA: {storeSettings?.pharmacist_sipa || '-'})
                  </p>
                </div>

                {/* Visual Status Stamp */}
                <div className="shrink-0">
                  {selectedInvoice.status === 'cancelled' || selectedInvoice.payment_status === 'cancelled' ? (
                    <div className="border-2 border-rose-600 bg-rose-50 text-rose-700 px-4 py-2 rounded-xl text-center">
                      <span className="block text-sm font-black tracking-wider uppercase">DIBATALKAN</span>
                      <span className="block text-[9px] font-bold">Pesanan Batal</span>
                    </div>
                  ) : selectedInvoice.payment_status === 'paid' ? (
                    <div className="border-2 border-emerald-600 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-center">
                      <span className="block text-sm font-black tracking-wider uppercase">LUNAS / SELESAI</span>
                      <span className="block text-[9px] font-bold">Terverifikasi</span>
                    </div>
                  ) : (
                    <div className="border-2 border-amber-600 bg-amber-50 text-amber-700 px-4 py-2 rounded-xl text-center">
                      <span className="block text-sm font-black tracking-wider uppercase">DALAM PROSES</span>
                      <span className="block text-[9px] font-bold">Belum Selesai</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Invoice Meta Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Left Meta */}
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl">
                  <div className="flex justify-between">
                    <span className="text-slate-500">No. Invoice:</span>
                    <span className="font-mono font-bold text-slate-900">{selectedInvoice.order_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Waktu Transaksi:</span>
                    <span className="font-bold text-slate-800">{formatDate(selectedInvoice.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Metode Pembayaran:</span>
                    <span className="font-bold text-slate-800 uppercase">{selectedInvoice.payment_method}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Opsi Pengiriman:</span>
                    <span className="font-bold text-slate-800 uppercase">{selectedInvoice.delivery_option}</span>
                  </div>
                </div>

                {/* Right Meta (Customer) */}
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nama Pelanggan:</span>
                    <span className="font-bold text-slate-900">{getCustomerInfo(selectedInvoice).name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">No. Telepon:</span>
                    <span className="font-bold text-slate-800">{getCustomerInfo(selectedInvoice).phone}</span>
                  </div>
                  <div className="text-slate-500 pt-1">
                    <span>Alamat: </span>
                    <span className="text-slate-800 font-medium block mt-0.5">
                      {getCustomerInfo(selectedInvoice).address}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-[10px] uppercase font-extrabold text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">No</th>
                      <th className="py-2.5 px-3">Nama Produk Obat</th>
                      <th className="py-2.5 px-3 text-center">Kemasan</th>
                      <th className="py-2.5 px-3 text-center">Qty</th>
                      <th className="py-2.5 px-3 text-right">Harga Satuan</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedInvoice.items || []).map((it, idx) => (
                      <tr key={it.id || idx}>
                        <td className="py-2 px-3 text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-slate-800">
                          {it.product_name_snapshot}
                        </td>
                        <td className="py-2 px-3 text-center text-slate-600">
                          {it.variant_name_snapshot || it.unit_snapshot || '-'}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-slate-800">
                          {it.quantity}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600">
                          {formatRupiah(it.price_snapshot)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-900">
                          {formatRupiah(it.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Total Calculation Details */}
              <div className="flex justify-end pt-2">
                <div className="w-full sm:w-64 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal Produk:</span>
                    <span className="font-medium">{formatRupiah(selectedInvoice.subtotal)}</span>
                  </div>
                  {Number(selectedInvoice.discount) > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Diskon Promo:</span>
                      <span>- {formatRupiah(selectedInvoice.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Biaya Pengiriman:</span>
                    <span className="font-medium">{formatRupiah(selectedInvoice.delivery_fee)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between font-extrabold text-slate-900 text-sm">
                    <span>TOTAL BAYAR:</span>
                    <span className="text-sky-700">{formatRupiah(selectedInvoice.total)}</span>
                  </div>
                </div>
              </div>

              {selectedInvoice.customer_note && (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-900">
                  <strong>Catatan Khusus:</strong> &ldquo;{selectedInvoice.customer_note}&rdquo;
                </div>
              )}
            </div>

            {/* Modal Bottom Buttons: Export XLSX, Export PDF, Print, Close */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => exportSingleInvoiceToExcel(selectedInvoice, storeSettings)}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Download XLSX</span>
                </button>

                <button
                  type="button"
                  onClick={() => exportSingleInvoiceToPDF(selectedInvoice, storeSettings)}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-sm"
                >
                  <FileText className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak (Print)</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
