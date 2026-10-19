import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Order, StoreSettings } from '@/lib/types';
import { getOrderStatusBadge, getPaymentStatusBadge } from '@/lib/utils';

export function formatDate(isoStr?: string): string {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoStr;
  }
}

export function formatSimpleDate(isoStr?: string): string {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoStr;
  }
}

function getCustomerName(order: Order): string {
  const addr = order.delivery_address && typeof order.delivery_address === 'object' ? order.delivery_address : null;
  return order.customer_name?.trim() || addr?.recipient_name?.trim() || 'Pelanggan Apotek';
}

function getCustomerPhone(order: Order): string {
  const addr = order.delivery_address && typeof order.delivery_address === 'object' ? order.delivery_address : null;
  return order.customer_phone?.trim() || addr?.phone?.trim() || '-';
}

function getDeliveryAddress(order: Order): string {
  const addr = order.delivery_address && typeof order.delivery_address === 'object' ? order.delivery_address : null;
  return addr?.address_line || '-';
}

/**
 * Export multiple orders to an Excel (.xlsx) file.
 * Contains 2 sheets:
 * 1. Daftar_Invoice: Main summary of all invoices
 * 2. Rincian_Obat: Detailed line items per invoice
 */
export function exportInvoicesToExcel(
  orders: Order[],
  storeSettings?: StoreSettings | null,
  filename?: string
) {
  const wb = XLSX.utils.book_new();
  const storeName = storeSettings?.store_name || 'Apotek Jabat';
  const exportTime = new Date().toLocaleString('id-ID');

  // Sheet 1: Main Invoices Table
  const invoiceRows: any[] = [];
  invoiceRows.push(['LAPORAN DAFTAR INVOICE & FAKTUR TRANSAKSI']);
  invoiceRows.push([`Apotek: ${storeName}`]);
  invoiceRows.push([`Waktu Unduh: ${exportTime}`]);
  invoiceRows.push([`Jumlah Faktur: ${orders.length}`]);
  invoiceRows.push([]); // blank line

  // Header columns
  invoiceRows.push([
    'No.',
    'No. Invoice',
    'Tanggal Transaksi',
    'Nama Pelanggan',
    'No. Telepon',
    'Status Pesanan',
    'Status Pembayaran',
    'Metode Pembayaran',
    'Opsi Pengiriman',
    'Alamat Pengiriman',
    'Jumlah Item',
    'Subtotal (Rp)',
    'Diskon (Rp)',
    'Ongkir (Rp)',
    'Total Akhir (Rp)',
    'Catatan Pasien',
  ]);

  let sumTotalAll = 0;
  let sumTotalPaid = 0;
  let sumTotalCancelled = 0;

  orders.forEach((ord, idx) => {
    const isPaid = ord.status !== 'cancelled' && ord.payment_status === 'paid';
    const isCancelled = ord.status === 'cancelled' || ord.payment_status === 'cancelled';
    const tot = Number(ord.total) || 0;

    sumTotalAll += tot;
    if (isPaid) sumTotalPaid += tot;
    if (isCancelled) sumTotalCancelled += tot;

    const itemsCount = (ord.items || []).reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);

    invoiceRows.push([
      idx + 1,
      ord.order_number,
      formatDate(ord.created_at),
      getCustomerName(ord),
      getCustomerPhone(ord),
      getOrderStatusBadge(ord.status).label,
      getPaymentStatusBadge(ord.payment_status).label,
      (ord.payment_method || '').toUpperCase(),
      (ord.delivery_option || '').toUpperCase(),
      getDeliveryAddress(ord),
      itemsCount,
      Number(ord.subtotal) || 0,
      Number(ord.discount) || 0,
      Number(ord.delivery_fee) || 0,
      tot,
      ord.customer_note || '-',
    ]);
  });

  // Summary footer in Sheet 1
  invoiceRows.push([]);
  invoiceRows.push(['', '', '', '', '', '', '', '', '', '', 'Total Faktur Keseluruhan:', '', '', '', sumTotalAll]);
  invoiceRows.push(['', '', '', '', '', '', '', '', '', '', 'Total Omzet Lunas / Berhasil:', '', '', '', sumTotalPaid]);
  invoiceRows.push(['', '', '', '', '', '', '', '', '', '', 'Total Nilai Dibatalkan:', '', '', '', sumTotalCancelled]);

  const wsInvoices = XLSX.utils.aoa_to_sheet(invoiceRows);

  // Column widths
  wsInvoices['!cols'] = [
    { wch: 5 },  // No
    { wch: 22 }, // No. Invoice
    { wch: 20 }, // Tanggal
    { wch: 24 }, // Pelanggan
    { wch: 16 }, // Telepon
    { wch: 24 }, // Status Pesanan
    { wch: 20 }, // Status Bayar
    { wch: 18 }, // Metode
    { wch: 16 }, // Pengiriman
    { wch: 35 }, // Alamat
    { wch: 12 }, // Jumlah
    { wch: 15 }, // Subtotal
    { wch: 14 }, // Diskon
    { wch: 14 }, // Ongkir
    { wch: 16 }, // Total
    { wch: 30 }, // Catatan
  ];

  XLSX.utils.book_append_sheet(wb, wsInvoices, 'Daftar_Invoice');

  // Sheet 2: Detailed Line Items
  const itemRows: any[] = [];
  itemRows.push(['RINCIAN ITEM OBAT PER INVOICE']);
  itemRows.push([`Apotek: ${storeName}`]);
  itemRows.push([]);
  itemRows.push([
    'No.',
    'No. Invoice',
    'Tanggal',
    'Nama Obat / Produk',
    'Kemasan / Varian',
    'Kuantitas',
    'Satuan',
    'Harga Satuan (Rp)',
    'Diskon (Rp)',
    'Subtotal (Rp)',
    'Status Pesanan',
  ]);

  let itemIdx = 1;
  orders.forEach((ord) => {
    (ord.items || []).forEach((it) => {
      itemRows.push([
        itemIdx++,
        ord.order_number,
        formatSimpleDate(ord.created_at),
        it.product_name_snapshot,
        it.variant_name_snapshot || '-',
        Number(it.quantity) || 1,
        it.unit_snapshot || 'unit',
        Number(it.price_snapshot) || 0,
        Number(it.discount) || 0,
        Number(it.subtotal) || 0,
        getOrderStatusBadge(ord.status).label,
      ]);
    });
  });

  const wsItems = XLSX.utils.aoa_to_sheet(itemRows);
  wsItems['!cols'] = [
    { wch: 5 },
    { wch: 22 },
    { wch: 14 },
    { wch: 30 },
    { wch: 18 },
    { wch: 10 },
    { wch: 10 },
    { wch: 16 },
    { wch: 14 },
    { wch: 16 },
    { wch: 20 },
  ];
  XLSX.utils.book_append_sheet(wb, wsItems, 'Rincian_Item_Obat');

  const nowStr = new Date().toISOString().slice(0, 10);
  const outName = filename || `Laporan_Invoice_${storeName.replace(/\s+/g, '_')}_${nowStr}.xlsx`;
  XLSX.writeFile(wb, outName);
}

/**
 * Export a single invoice to an Excel (.xlsx) file.
 */
export function exportSingleInvoiceToExcel(order: Order, storeSettings?: StoreSettings | null) {
  const wb = XLSX.utils.book_new();
  const storeName = storeSettings?.store_name || 'Apotek Jabat';

  const rows: any[] = [];
  rows.push([storeName.toUpperCase()]);
  if (storeSettings?.branch_name) rows.push([`Cabang: ${storeSettings.branch_name}`]);
  if (storeSettings?.address) rows.push([storeSettings.address]);
  if (storeSettings?.phone) rows.push([`Telp: ${storeSettings.phone}`]);
  if (storeSettings?.pharmacist_name) rows.push([`Apoteker PJ: ${storeSettings.pharmacist_name} (SIPA: ${storeSettings.pharmacist_sipa || '-'})`]);
  rows.push([]);
  rows.push(['FAKTUR / INVOICE PENJUALAN']);
  rows.push(['No. Invoice', order.order_number]);
  rows.push(['Tanggal Transaksi', formatDate(order.created_at)]);
  rows.push(['Status Pesanan', getOrderStatusBadge(order.status).label]);
  rows.push(['Status Pembayaran', getPaymentStatusBadge(order.payment_status).label]);
  rows.push(['Metode Pembayaran', (order.payment_method || '').toUpperCase()]);
  rows.push(['Opsi Pengiriman', (order.delivery_option || '').toUpperCase()]);
  rows.push(['Nama Pasien/Pembeli', getCustomerName(order)]);
  rows.push(['No. Telepon', getCustomerPhone(order)]);
  rows.push(['Alamat Pengiriman', getDeliveryAddress(order)]);
  if (order.customer_note) rows.push(['Catatan Khusus', order.customer_note]);
  rows.push([]);

  // Table of items
  rows.push(['No.', 'Nama Produk / Obat', 'Varian/Kemasan', 'Qty', 'Satuan', 'Harga Satuan (Rp)', 'Diskon (Rp)', 'Subtotal (Rp)']);

  (order.items || []).forEach((it, idx) => {
    rows.push([
      idx + 1,
      it.product_name_snapshot,
      it.variant_name_snapshot || '-',
      Number(it.quantity) || 1,
      it.unit_snapshot || 'unit',
      Number(it.price_snapshot) || 0,
      Number(it.discount) || 0,
      Number(it.subtotal) || 0,
    ]);
  });

  rows.push([]);
  rows.push(['', '', '', '', '', '', 'Subtotal:', Number(order.subtotal) || 0]);
  rows.push(['', '', '', '', '', '', 'Diskon Promo/Voucher:', Number(order.discount) || 0]);
  rows.push(['', '', '', '', '', '', 'Ongkos Kirim:', Number(order.delivery_fee) || 0]);
  rows.push(['', '', '', '', '', '', 'TOTAL PEMBAYARAN:', Number(order.total) || 0]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 32 },
    { wch: 18 },
    { wch: 8 },
    { wch: 10 },
    { wch: 18 },
    { wch: 22 },
    { wch: 20 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Faktur_Invoice');
  XLSX.writeFile(wb, `Invoice_${order.order_number}.xlsx`);
}

/**
 * Export multiple orders to a clean, professional PDF file.
 */
export function exportInvoicesToPDF(
  orders: Order[],
  storeSettings?: StoreSettings | null,
  filterDescription?: string
) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const storeName = storeSettings?.store_name || 'Apotek Jabat';
  const branchName = storeSettings?.branch_name || 'Bandung';

  // Pharmacy Brand Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(14, 116, 144); // Cyan / Sky 700
  doc.text(storeName.toUpperCase(), 40, 40);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text(`${storeSettings?.address || 'Layanan Farmasi Digital'} • Telp: ${storeSettings?.phone || '-'} • Apoteker PJ: ${storeSettings?.pharmacist_name || 'apt. Siti Rahma, S.Farm.'}`, 40, 54);

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.line(40, 62, 802, 62);

  // Document Title & Summary Info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text('LAPORAN DAFTAR FAKTUR & INVOICE TRANSAKSI', 40, 80);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Waktu Cetak: ${new Date().toLocaleString('id-ID')} | Filter: ${filterDescription || 'Semua Data'} | Total: ${orders.length} Faktur`, 40, 94);

  // Calculations
  const totalPaid = orders
    .filter((o) => o.status !== 'cancelled' && o.payment_status === 'paid')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const totalCancelled = orders
    .filter((o) => o.status === 'cancelled' || o.payment_status === 'cancelled')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  const countCancelled = orders.filter((o) => o.status === 'cancelled' || o.payment_status === 'cancelled').length;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // Emerald
  doc.text(`Omzet Berhasil/Lunas: Rp ${totalPaid.toLocaleString('id-ID')}`, 550, 80);
  doc.setTextColor(239, 68, 68); // Rose
  doc.text(`Faktur Dibatalkan: ${countCancelled} (Rp ${totalCancelled.toLocaleString('id-ID')})`, 550, 94);

  // Build table data
  const tableHead = [
    ['No', 'No. Invoice', 'Tanggal', 'Pelanggan', 'No. HP', 'Status Pesanan', 'Status Bayar', 'Metode', 'Item', 'Total (Rp)'],
  ];

  const tableBody = orders.map((ord, idx) => {
    const itemsCount = (ord.items || []).reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);
    const orderBadge = getOrderStatusBadge(ord.status);
    const payBadge = getPaymentStatusBadge(ord.payment_status);

    return [
      idx + 1,
      ord.order_number,
      formatDate(ord.created_at),
      getCustomerName(ord),
      getCustomerPhone(ord),
      orderBadge.label,
      payBadge.label,
      (ord.payment_method || '').toUpperCase(),
      `${itemsCount} item`,
      `Rp ${Number(ord.total || 0).toLocaleString('id-ID')}`,
    ];
  });

  autoTable(doc, {
    startY: 105,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 4,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [14, 116, 144], // Sky 700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // Slate 50
    },
    columnStyles: {
      0: { cellWidth: 25, halign: 'center' },
      1: { cellWidth: 85, fontStyle: 'bold' },
      2: { cellWidth: 80 },
      3: { cellWidth: 95 },
      4: { cellWidth: 65 },
      5: { cellWidth: 95 },
      6: { cellWidth: 75 },
      7: { cellWidth: 50, halign: 'center' },
      8: { cellWidth: 45, halign: 'center' },
      9: { cellWidth: 70, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      // Highlight cancelled status with soft rose color
      if (data.section === 'body') {
        const rowOrder = orders[data.row.index];
        if (rowOrder && (rowOrder.status === 'cancelled' || rowOrder.payment_status === 'cancelled')) {
          if (data.column.index === 5 || data.column.index === 6) {
            data.cell.styles.textColor = [190, 18, 60]; // Rose 700
            data.cell.styles.fontStyle = 'bold';
          }
        } else if (data.column.index === 6 && rowOrder?.payment_status === 'paid') {
          data.cell.styles.textColor = [4, 120, 87]; // Emerald 700
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
    margin: { left: 40, right: 40 },
    didDrawPage: (data) => {
      // Footer page numbering
      const pageStr = `Halaman ${data.pageNumber}`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(pageStr, 400, 570, { align: 'center' });
      doc.text(`Dokumen resmi dihasilkan oleh Sistem Manajemen Apotek ${storeName}`, 802, 570, { align: 'right' });
    },
  });

  const nowStr = new Date().toISOString().slice(0, 10);
  doc.save(`Laporan_Invoice_${storeName.replace(/\s+/g, '_')}_${nowStr}.pdf`);
}

/**
 * Export a single invoice to an official, beautifully styled PDF document.
 */
export function exportSingleInvoiceToPDF(order: Order, storeSettings?: StoreSettings | null) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const storeName = storeSettings?.store_name || 'Apotek Jabat';
  const branch = storeSettings?.branch_name || 'Bandung';
  const phone = storeSettings?.phone || '0812-3456-7890';
  const pharmacist = storeSettings?.pharmacist_name || 'apt. Siti Rahma, S.Farm.';
  const sipa = storeSettings?.pharmacist_sipa || '19870412/SIPA-31.74/2021/2048';

  // 1. Header Pharmacy
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(14, 116, 144); // Sky 700
  doc.text(storeName.toUpperCase(), 40, 50);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Cabang: ${branch} • Layanan Farmasi & Tebus Resep Digital`, 40, 65);
  doc.text(`${storeSettings?.address || 'Jl. Raya Apotek No. 42'} • Kontak: ${phone}`, 40, 78);
  doc.text(`Apoteker PJ: ${pharmacist} | SIPA: ${sipa}`, 40, 91);

  // Status Stamp in Header Right
  const isCancelled = order.status === 'cancelled' || order.payment_status === 'cancelled';
  const isPaid = !isCancelled && order.payment_status === 'paid';

  doc.setLineWidth(1.5);
  if (isCancelled) {
    doc.setDrawColor(225, 29, 72); // Rose 600
    doc.setFillColor(255, 241, 242);
    doc.roundedRect(420, 38, 135, 45, 6, 6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(225, 29, 72);
    doc.text('DIBATALKAN', 487, 60, { align: 'center' });
    doc.setFontSize(8);
    doc.text('Pesanan Tidak Diproses', 487, 73, { align: 'center' });
  } else if (isPaid) {
    doc.setDrawColor(16, 185, 129); // Emerald 500
    doc.setFillColor(236, 253, 245);
    doc.roundedRect(420, 38, 135, 45, 6, 6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(5, 150, 105);
    doc.text('LUNAS / SELESAI', 487, 60, { align: 'center' });
    doc.setFontSize(8);
    doc.text('Pembayaran Terverifikasi', 487, 73, { align: 'center' });
  } else {
    doc.setDrawColor(217, 119, 6); // Amber
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(420, 38, 135, 45, 6, 6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(180, 83, 9);
    doc.text('DALAM PROSES', 487, 60, { align: 'center' });
    doc.setFontSize(8);
    doc.text('Menunggu Konfirmasi', 487, 73, { align: 'center' });
  }

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(1);
  doc.line(40, 105, 555, 105);

  // 2. Invoice Meta Details (2 columns: Left Invoice Info, Right Customer Info)
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('FAKTUR PENJUALAN OBAT', 40, 125);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  // Left Column
  doc.text(`Nomor Faktur   : `, 40, 142);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(order.order_number, 115, 142);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Tanggal Waktu  : ${formatDate(order.created_at)}`, 40, 156);
  doc.text(`Metode Bayar   : ${(order.payment_method || '').toUpperCase()}`, 40, 170);
  doc.text(`Pengiriman     : ${(order.delivery_option || '').toUpperCase()}`, 40, 184);

  // Right Column
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('DATA PEMESAN & ALAMAT:', 320, 125);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Nama Pelanggan : ${getCustomerName(order)}`, 320, 142);
  doc.text(`No. Handphone  : ${getCustomerPhone(order)}`, 320, 156);
  const addrText = doc.splitTextToSize(`Alamat Kirim   : ${getDeliveryAddress(order)}`, 230);
  doc.text(addrText, 320, 170);

  // 3. Items Table
  const itemsHead = [['No', 'Nama Produk / Obat Farmasi', 'Varian', 'Qty', 'Harga (Rp)', 'Subtotal (Rp)']];
  const itemsBody = (order.items || []).map((it, idx) => [
    idx + 1,
    it.product_name_snapshot,
    it.variant_name_snapshot || it.unit_snapshot || '-',
    Number(it.quantity) || 1,
    `Rp ${Number(it.price_snapshot || 0).toLocaleString('id-ID')}`,
    `Rp ${Number(it.subtotal || 0).toLocaleString('id-ID')}`,
  ]);

  autoTable(doc, {
    startY: 215,
    head: itemsHead,
    body: itemsBody,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 5,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [14, 116, 144], // Sky 700
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 25, halign: 'center' },
      1: { cellWidth: 220 },
      2: { cellWidth: 80 },
      3: { cellWidth: 35, halign: 'center' },
      4: { cellWidth: 75, halign: 'right' },
      5: { cellWidth: 80, halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 40, right: 40 },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 350;

  // 4. Financial Summary box on the right
  const summaryX = 330;
  let currentY = finalY + 15;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);

  doc.text('Subtotal Produk', summaryX, currentY);
  doc.text(`Rp ${Number(order.subtotal || 0).toLocaleString('id-ID')}`, 555, currentY, { align: 'right' });
  currentY += 14;

  if (Number(order.discount) > 0) {
    doc.setTextColor(16, 185, 129);
    doc.text('Diskon Promo/Voucher', summaryX, currentY);
    doc.text(`- Rp ${Number(order.discount).toLocaleString('id-ID')}`, 555, currentY, { align: 'right' });
    currentY += 14;
  }

  doc.setTextColor(71, 85, 105);
  doc.text('Biaya Pengiriman', summaryX, currentY);
  doc.text(`Rp ${Number(order.delivery_fee || 0).toLocaleString('id-ID')}`, 555, currentY, { align: 'right' });
  currentY += 16;

  // Grand Total Line
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(1);
  doc.line(summaryX, currentY - 6, 555, currentY - 6);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('TOTAL PEMBAYARAN', summaryX, currentY + 6);
  doc.setTextColor(14, 116, 144);
  doc.text(`Rp ${Number(order.total || 0).toLocaleString('id-ID')}`, 555, currentY + 6, { align: 'right' });

  // 5. Notes / Terms
  const notesY = Math.max(currentY + 40, finalY + 80);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text('* Faktur ini merupakan bukti transaksi yang sah dan dikeluarkan oleh sistem farmasi resmi Apotek.', 40, notesY);
  doc.text('* Obat yang telah dibeli tidak dapat ditukar/dikembalikan kecuali terjadi kerusakan kemasan saat pengiriman.', 40, notesY + 12);
  if (order.customer_note) {
    doc.text(`* Catatan Khusus Pelanggan: "${order.customer_note}"`, 40, notesY + 24);
  }

  // Signature Block
  const sigY = notesY + 45;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Penerima / Pasien,', 80, sigY, { align: 'center' });
  doc.text('Apoteker Penanggung Jawab,', 460, sigY, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`( ${getCustomerName(order)} )`, 80, sigY + 50, { align: 'center' });
  doc.text(`( ${pharmacist} )`, 460, sigY + 50, { align: 'center' });
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`SIPA: ${sipa}`, 460, sigY + 60, { align: 'center' });

  doc.save(`Invoice_${order.order_number}.pdf`);
}
