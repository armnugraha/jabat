'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ShieldCheck,
  CheckSquare,
  Square,
  Trash2,
  Heart,
  Plus,
  Minus,
  MapPin,
  Bike,
  Sparkles,
  Tag,
  CreditCard,
  QrCode,
  Banknote,
  FileUp,
  X,
  AlertTriangle,
  ChevronRight,
  Info,
  Building,
  Check,
  Edit2,
  AlertCircle,
  Loader2,
  Copy,
  Package,
} from 'lucide-react';
import { useCart } from '@/lib/store/cart-context';
import { useAuth } from '@/lib/store/auth-context';
import { formatRupiah } from '@/lib/utils';
import { DeliveryOption, PaymentMethod, Promotion, CustomerAddress } from '@/lib/types';

export default function CartPage() {
  const router = useRouter();
  const { user, authFetch } = useAuth();

  const {
    items,
    updateQuantity,
    removeItem,
    toggleItemSelection,
    toggleSelectAll,
    allSelected,
    itemCount,
    selectedCount,
    subtotal,
    productDiscountTotal,
    appliedPromo,
    applyPromo,
    removePromo,
    promoDiscount,
    deliveryOption,
    setDeliveryOption,
    deliveryFee,
    paymentMethod,
    setPaymentMethod,
    customerNotes,
    setCustomerNotes,
    prescriptionFile,
    prescriptionPreviewUrl,
    setPrescriptionFile,
    hasPrescriptionItems,
    total,
    clearCart,
    isLoaded,
    storeSettings,
    availablePromotions,
  } = useCart();

  // Real-time availability validation state
  const [availabilityMap, setAvailabilityMap] = useState<
    Record<string, { available: boolean; reason: string | null; currentStock?: number; name?: string }>
  >({});
  const [isValidatingCart, setIsValidatingCart] = useState(false);

  // Validate cart items against live catalog
  const validateCart = async (itemsToValidate = items) => {
    if (!itemsToValidate || itemsToValidate.length === 0) {
      setAvailabilityMap({});
      return;
    }
    setIsValidatingCart(true);
    try {
      const res = await fetch('/api/cart/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToValidate }),
      });
      const json = await res.json();
      if (json.success && json.items) {
        setAvailabilityMap(json.items);
      }
    } catch (e) {
      console.warn('Cart validation error:', e);
    } finally {
      setIsValidatingCart(false);
    }
  };

  useEffect(() => {
    if (isLoaded && items.length > 0) {
      validateCart(items);
    } else if (items.length === 0) {
      setAvailabilityMap({});
    }
  }, [isLoaded, items]);

  // Valid selected items that are available & active
  const validSelectedItems = useMemo(() => {
    return items.filter((item) => {
      const status = availabilityMap[item.id];
      const isAvailable = status !== undefined ? status.available : true;
      return item.selected && isAvailable;
    });
  }, [items, availabilityMap]);

  const validSelectedCount = useMemo(() => {
    return validSelectedItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [validSelectedItems]);

  const unavailableItemsCount = useMemo(() => {
    return items.filter((item) => {
      const status = availabilityMap[item.id];
      return status !== undefined && !status.available;
    }).length;
  }, [items, availabilityMap]);

  // Gross & Subtotal for valid items
  const effectiveGrossProductTotal = useMemo(() => {
    return validSelectedItems.reduce(
      (sum, item) => sum + (item.variant.strike_price || item.variant.price) * item.quantity,
      0
    );
  }, [validSelectedItems]);

  const effectiveSubtotal = useMemo(() => {
    return validSelectedItems.reduce(
      (sum, item) => sum + item.variant.price * item.quantity,
      0
    );
  }, [validSelectedItems]);

  const effectiveProductDiscountTotal = Math.max(0, effectiveGrossProductTotal - effectiveSubtotal);

  const expressFee = storeSettings?.express_delivery_fee ?? 10000;
  const regularFee = storeSettings?.regular_delivery_fee ?? 15000;
  const freeThreshold = storeSettings?.free_delivery_threshold ?? 100000;

  const effectiveDeliveryFee =
    deliveryOption === 'pickup'
      ? 0
      : deliveryOption === 'express'
      ? effectiveSubtotal >= freeThreshold && effectiveSubtotal > 0
        ? 0
        : expressFee
      : regularFee;

  const effectivePromoDiscount =
    appliedPromo && effectiveSubtotal >= (appliedPromo.min_order_amount || 0)
      ? appliedPromo.discount_type === 'percentage'
        ? Math.min(
            Math.round((effectiveSubtotal * appliedPromo.discount_value) / 100),
            appliedPromo.max_discount || Infinity
          )
        : appliedPromo.discount_value
      : 0;

  const effectiveTotal = Math.max(0, effectiveSubtotal + effectiveDeliveryFee - effectivePromoDiscount);

  const effectiveHasPrescriptionItems = validSelectedItems.some(
    (item) => item.product.requires_prescription
  );

  // Addresses state
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<CustomerAddress | null>(null);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isAddingAddress, setIsAddingAddress] = useState(false);

  // New Address Form State
  const [newLabel, setNewLabel] = useState('Rumah');
  const [newRecipientName, setNewRecipientName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddressLine, setNewAddressLine] = useState('');
  const [newSubdistrict, setNewSubdistrict] = useState('');
  const [newCity, setNewCity] = useState('Jakarta Selatan');
  const [newPostalCode, setNewPostalCode] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  // Fetch addresses from API when user is logged in
  const loadAddresses = () => {
    if (!user?.id) {
      setAddresses([]);
      setSelectedAddress(null);
      return;
    }
    setIsLoadingAddresses(true);

    authFetch(`/api/addresses?userId=${user.id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data && json.data.length > 0) {
          setAddresses(json.data);
          const primary = json.data.find((a: CustomerAddress) => a.is_primary) || json.data[0];
          setSelectedAddress(primary);
        }
      })
      .catch((err) => console.error('Failed loading addresses:', err))
      .finally(() => setIsLoadingAddresses(false));
  };

  useEffect(() => {
    loadAddresses();
    if (user) {
      setNewRecipientName(user.full_name || '');
      setNewPhone(user.phone || '');
    }
  }, [user]);

  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [prescriptionNotes, setPrescriptionNotes] = useState('');
  const [copiedBankId, setCopiedBankId] = useState<string | null>(null);

  const bankAccounts = (storeSettings?.bank_accounts && storeSettings.bank_accounts.length > 0)
    ? storeSettings.bank_accounts
    : storeSettings?.bank_account_number
    ? [
        {
          id: 'acc-default',
          bank_name: storeSettings.bank_name || 'Bank Central Asia (BCA)',
          account_number: storeSettings.bank_account_number,
          account_holder: storeSettings.bank_account_holder || storeSettings.store_name || 'Apotek Jabat',
        },
      ]
    : [];

  const isQrisAvailable = storeSettings?.qris_enabled !== false;
  const isBankTransferAvailable = storeSettings?.bank_transfer_enabled !== false && bankAccounts.length > 0;
  const isCodAvailable = storeSettings?.cod_enabled !== false;

  // Auto-switch payment method if selected method is disabled in store settings
  useEffect(() => {
    if (storeSettings) {
      if (paymentMethod === 'qris' && !isQrisAvailable) {
        if (isBankTransferAvailable) setPaymentMethod('bank_transfer');
        else if (isCodAvailable) setPaymentMethod('cod');
      } else if (paymentMethod === 'bank_transfer' && !isBankTransferAvailable) {
        if (isQrisAvailable) setPaymentMethod('qris');
        else if (isCodAvailable) setPaymentMethod('cod');
      } else if (paymentMethod === 'cod' && !isCodAvailable) {
        if (isQrisAvailable) setPaymentMethod('qris');
        else if (isBankTransferAvailable) setPaymentMethod('bank_transfer');
      }
    }
  }, [storeSettings, isQrisAvailable, isBankTransferAvailable, isCodAvailable, paymentMethod, setPaymentMethod]);

  const handleCopyAccount = (id: string, text: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedBankId(id);
      setTimeout(() => setCopiedBankId(null), 2500);
    }
  };

  const handleApplyPromo = () => {
    setPromoError('');
    const result = applyPromo(promoInput);
    if (!result.success) {
      setPromoError(result.message);
    } else {
      setIsPromoModalOpen(false);
      setPromoInput('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPrescriptionFile(e.target.files[0]);
    }
  };

  const handleSaveNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('Silakan masuk ke akun Anda terlebih dahulu.');
      return;
    }
    if (!newRecipientName.trim() || !newPhone.trim() || !newAddressLine.trim()) {
      alert('Nama penerima, nomor telepon, dan alamat lengkap wajib diisi.');
      return;
    }

    setIsSavingAddress(true);
    try {
      const res = await authFetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: user.id,
          label: newLabel,
          recipientName: newRecipientName.trim(),
          phone: newPhone.trim(),
          addressLine: newAddressLine.trim(),
          subdistrict: newSubdistrict.trim(),
          city: newCity.trim(),
          postalCode: newPostalCode.trim(),
          deliveryNotes: newNotes.trim(),
          isPrimary: addresses.length === 0,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const newAddr = json.data;
        const updatedList = [newAddr, ...addresses.filter((a) => a.id !== newAddr.id)];
        setAddresses(updatedList);
        setSelectedAddress(newAddr);

        setIsAddingAddress(false);
        setIsAddressModalOpen(false);
        // Reset form fields
        setNewAddressLine('');
        setNewSubdistrict('');
        setNewPostalCode('');
        setNewNotes('');
      } else {
        alert(json.error || 'Gagal menyimpan alamat');
      }
    } catch (err) {
      console.error('Save address error:', err);
      alert('Gagal menyimpan alamat pengiriman.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      alert('Silakan masuk (login) ke akun Anda terlebih dahulu sebelum melakukan checkout pesanan.');
      router.push('/account');
      return;
    }

    if (!selectedAddress) {
      alert('Silakan tambahkan atau pilih alamat pengiriman Anda terlebih dahulu.');
      setIsAddressModalOpen(true);
      return;
    }

    if (validSelectedCount === 0) {
      alert('Pilih minimal 1 produk atau paket bundling yang tersedia untuk checkout.');
      return;
    }

    if (effectiveHasPrescriptionItems && !prescriptionFile) {
      alert('Pesanan ini mengandung obat keras yang memerlukan unggah foto resep dokter.');
      return;
    }

    setIsPlacingOrder(true);
    try {
      // 1. Re-validate items with backend right before order creation to avoid out-of-stock / disabled items
      const verifyRes = await fetch('/api/cart/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: validSelectedItems }),
      });
      const verifyJson = await verifyRes.json();

      if (verifyJson.success && (verifyJson.hasUnavailable || (verifyJson.unavailableList && verifyJson.unavailableList.length > 0))) {
        setAvailabilityMap((prev) => ({ ...prev, ...(verifyJson.items || {}) }));
        const listText = (verifyJson.unavailableList || [])
          .map((u: any) => `• ${u.name}: ${u.reason}`)
          .join('\n');

        alert(
          `Mohon maaf, beberapa barang yang Anda pilih saat ini tidak tersedia atau telah dinonaktifkan oleh apotek:\n\n${listText}\n\nRincian pembayaran telah diperbarui secara otomatis. Silakan hapus item tersebut dari keranjang Anda untuk melanjutkan.`
        );
        setIsPlacingOrder(false);
        return;
      }

      // 2. Submit validated order
      const res = await authFetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: user.id,
          customerName: user.full_name || selectedAddress.recipient_name,
          customerPhone: user.phone || selectedAddress.phone,
          items: validSelectedItems,
          subtotal: effectiveSubtotal,
          discount: effectiveProductDiscountTotal + effectivePromoDiscount,
          deliveryFee: effectiveDeliveryFee,
          total: effectiveTotal,
          deliveryOption,
          deliveryAddress: {
            label: selectedAddress.label,
            recipient_name: selectedAddress.recipient_name,
            phone: selectedAddress.phone,
            address_line: `${selectedAddress.address_line}${selectedAddress.subdistrict ? ', ' + selectedAddress.subdistrict : ''}${selectedAddress.city ? ', ' + selectedAddress.city : ''}${selectedAddress.postal_code ? ' ' + selectedAddress.postal_code : ''}`,
            notes: selectedAddress.delivery_notes || customerNotes,
          },
          paymentMethod,
          customerNotes,
          requiresPrescription: effectiveHasPrescriptionItems,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        clearCart();
        router.push(`/orders?placed=true&id=${json.data.id}`);
      } else {
        alert(json.error || 'Gagal memproses pesanan.');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Terjadi kesalahan jaringan saat membuat pesanan.');
    } finally {
      setIsPlacingOrder(false);
    }
  };


  return (
    <div className="flex flex-col min-h-screen bg-slate-50 pb-32 lg:pb-16">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-100 transition border border-slate-200/80 bg-white shadow-2xs"
              aria-label="Kembali"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-sm md:text-base font-bold text-slate-900 leading-tight">
                Keranjang Belanja ({itemCount} item)
              </h1>
            </div>
          </div>

          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs md:text-sm font-bold text-rose-600 hover:text-rose-700 px-3 py-1.5 rounded-xl hover:bg-rose-50 transition"
            >
              Kosongkan Keranjang
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 space-y-4 pt-4">
        {!isLoaded ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center my-6 shadow-stitch flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
            <p className="text-xs font-bold text-slate-700">Memuat keranjang belanja Anda...</p>
            <p className="text-[11px] text-slate-400">Sinkronisasi data keranjang farmasi...</p>
          </div>
        ) : items.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* ========================================================================= */}
            {/* GRID 1 (LEFT / LEBAR): List Produk Keranjang & Resep Dokter               */}
            {/* ========================================================================= */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-4">
              {/* Select All Row */}
              <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-stitch text-xs">
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 font-bold text-slate-800 hover:text-sky-600 transition"
                >
                  {allSelected ? (
                    <CheckSquare className="w-4 h-4 text-sky-600 fill-sky-100" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-300" />
                  )}
                  <span>Pilih Semua ({items.length} produk)</span>
                </button>

                <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate max-w-[200px] sm:max-w-none">
                    {storeSettings?.store_name || 'Apotek JABAT'} – {storeSettings?.branch_name || 'Rancaekek'}
                  </span>
                </div>
              </div>

              {/* Safety & Hygiene Guarantee Banner */}
              <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-3.5 flex items-start gap-2.5 text-xs text-sky-950">
                <ShieldCheck className="w-4.5 h-4.5 text-sky-600 shrink-0 mt-0.5" />
                <p className="text-[11px] leading-relaxed">
                  Semua obat dikemas higienis dengan segel anti-rusak farmasi dan pouch suhu terjaga oleh apoteker resmi kami.
                </p>
              </div>

              {/* Unavailable Items Global Warning Banner */}
              {unavailableItemsCount > 0 && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 flex items-start gap-2.5 text-xs text-rose-950 shadow-2xs">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-rose-900">
                      Ada {unavailableItemsCount} produk/paket dalam keranjang Anda yang tidak tersedia atau dinonaktifkan.
                    </p>
                    <p className="text-[11px] text-rose-700 leading-relaxed">
                      Barang yang tidak aktif atau habis stok otomatis tidak dihitung pada total tagihan dan tidak dapat dibeli. Silakan hapus item tersebut dari keranjang.
                    </p>
                  </div>
                </div>
              )}

              {/* Cart Item Cards */}
              <div className="space-y-3">
                {items.map((item) => {
                  const isPrescription = item.product.requires_prescription;
                  const itemStatus = availabilityMap[item.id];
                  const isUnavailable = itemStatus !== undefined && !itemStatus.available;
                  const unavailableReason = itemStatus?.reason || 'Produk atau paket sedang tidak aktif/tersedia';
                  const maxStock = isUnavailable ? 0 : (itemStatus?.currentStock ?? item.variant.stock ?? 999);
                  const isMaxStockReached = item.quantity >= maxStock;

                  return (
                    <div
                      key={item.id}
                      className={`bg-white rounded-3xl border p-4 shadow-stitch transition-all ${
                        isUnavailable
                          ? 'border-rose-200 bg-rose-50/25 ring-1 ring-rose-200/50'
                          : item.selected
                          ? 'border-slate-200'
                          : 'border-slate-200/50 opacity-70'
                      }`}
                    >
                      {/* Unavailable Notice Banner at top of card */}
                      {isUnavailable && (
                        <div className="mb-3 px-3 py-2 rounded-xl bg-rose-50 border border-rose-200/80 flex items-center justify-between gap-2 text-rose-900 text-xs">
                          <div className="flex items-center gap-1.5 font-bold">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span className="line-clamp-1">{unavailableReason}</span>
                          </div>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-600 text-white shrink-0 shadow-2xs">
                            Tidak Tersedia
                          </span>
                        </div>
                      )}

                      <div className="flex items-start gap-3.5">
                        {/* Item Checkbox */}
                        <button
                          onClick={() => {
                            if (!isUnavailable) {
                              toggleItemSelection(item.id);
                            }
                          }}
                          disabled={isUnavailable}
                          className={`mt-1 ${isUnavailable ? 'cursor-not-allowed opacity-40' : ''}`}
                          title={isUnavailable ? 'Barang tidak tersedia' : 'Pilih produk'}
                        >
                          {item.selected && !isUnavailable ? (
                            <CheckSquare className="w-4 h-4 text-sky-600 fill-sky-100" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300" />
                          )}
                        </button>

                        {/* Thumbnail Image */}
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-50 border border-slate-100 p-1.5 shrink-0 overflow-hidden flex items-center justify-center">
                          <img
                            src={item.product.image_url}
                            alt={item.product.name}
                            className={`w-full h-full object-contain mix-blend-multiply ${
                              isUnavailable ? 'grayscale opacity-50' : ''
                            }`}
                          />
                          {item.is_bundle && (
                            <div className="absolute bottom-1 right-1 bg-amber-500 text-white p-1 rounded-lg shadow-xs">
                              <Package className="w-3 h-3" />
                            </div>
                          )}
                          {isUnavailable && (
                            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[0.5px] rounded-2xl flex items-center justify-center p-1">
                              <span className="text-[8px] font-black uppercase text-white bg-rose-600 px-1 py-0.5 rounded">
                                Nonaktif
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Item Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            {isUnavailable && (
                              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-300">
                                ✕ Tidak Tersedia
                              </span>
                            )}
                            {item.is_bundle ? (
                              <>
                                <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500 text-white flex items-center gap-1 shadow-2xs">
                                  <Package className="w-3 h-3" />
                                  Paket Bundling
                                </span>
                                {item.bundle?.category && (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                    {item.bundle.category}
                                  </span>
                                )}
                                {!isUnavailable && item.variant.strike_price && item.variant.strike_price > item.variant.price && (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                                    Hemat {Math.round(((item.variant.strike_price - item.variant.price) / item.variant.strike_price) * 100)}%
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                {item.bundle_name && (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                                    📦 {item.bundle_name}
                                  </span>
                                )}
                                <span
                                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                    isPrescription
                                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  }`}
                                >
                                  • {isPrescription ? 'Wajib Resep' : 'Obat Bebas'}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium truncate">
                                  • {item.product.manufacturer || 'Kimia Farma'}
                                </span>
                              </>
                            )}
                          </div>

                          <h4 className={`text-xs sm:text-sm font-bold line-clamp-1 ${isUnavailable ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                            {item.product.name}
                          </h4>

                          {item.is_bundle ? (
                            <div className="mt-2 p-2 rounded-xl bg-amber-50/60 border border-amber-100 text-[10px] text-slate-700 space-y-1">
                              <div className="font-bold text-amber-900 flex items-center gap-1 text-[10px]">
                                <Package className="w-3 h-3 text-amber-600" />
                                <span>Isi Paket ({item.bundle?.items?.length || 0} macam produk):</span>
                              </div>
                              <div className="space-y-0.5 pl-1">
                                {item.bundle?.items?.map((bItem, bIdx) => (
                                  <div key={bIdx} className="flex items-center justify-between text-[10px] text-slate-600">
                                    <span className="truncate">
                                      • <strong className="text-amber-800">{bItem.quantity}x</strong> {bItem.product?.name || 'Produk'}
                                    </span>
                                    <span className="text-[9px] text-slate-400 shrink-0 ml-2">
                                      {bItem.variant?.name || 'Varian'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="text-[10px] sm:text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                              Kemasan: <strong className="text-slate-700">{item.variant.name}</strong> ({item.variant.quantity_per_package} {item.variant.unit}) • Sisa Stok: {isUnavailable ? 0 : item.variant.stock}
                            </p>
                          )}

                          <div className="flex items-baseline gap-1.5 mt-2 flex-wrap">
                            {isUnavailable ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs sm:text-sm font-bold text-slate-400 line-through">
                                  {formatRupiah(item.variant.price)}
                                </span>
                                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                  Tidak Dihitung
                                </span>
                              </div>
                            ) : (
                              <>
                                <span className="text-xs sm:text-sm font-extrabold text-sky-700">
                                  {formatRupiah(item.variant.price)}
                                </span>
                                {item.variant.strike_price && item.variant.strike_price > item.variant.price && (
                                  <>
                                    <span className="text-[10px] text-slate-400 line-through">
                                      {formatRupiah(item.variant.strike_price)}
                                    </span>
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                                      Hemat {formatRupiah(item.variant.strike_price - item.variant.price)}
                                    </span>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Bar (Delete & Quantity Controls) */}
                      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100">
                        {isUnavailable ? (
                          <div className="w-full flex items-center justify-between gap-2">
                            <button
                              onClick={() => removeItem(item.id)}
                              className="text-xs text-rose-600 hover:text-rose-700 font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus Barang Tidak Tersedia</span>
                            </button>
                            <span className="text-[10px] text-rose-500 font-semibold italic">
                              Tidak bisa dicheckout
                            </span>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="text-[11px] text-slate-400 hover:text-rose-500 font-medium flex items-center gap-1 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Hapus</span>
                            </button>

                            <div className="flex items-center gap-2">
                              {isMaxStockReached && (
                                <span className="text-[9px] text-amber-600 font-bold hidden sm:inline">
                                  Maks. stok ({maxStock})
                                </span>
                              )}
                              <div className="flex items-center gap-1 border border-slate-200 rounded-xl p-0.5 bg-slate-50">
                                <button
                                  onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                                  disabled={item.quantity <= 1}
                                  className="w-6 h-6 flex items-center justify-center rounded-lg bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold shadow-2xs transition"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>

                                {/* Manual typing quantity input strictly text-center */}
                                <input
                                  type="number"
                                  min="1"
                                  max={maxStock}
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const typed = parseInt(e.target.value, 10);
                                    if (isNaN(typed) || typed < 1) {
                                      updateQuantity(item.id, 1);
                                    } else {
                                      updateQuantity(item.id, Math.min(typed, maxStock));
                                    }
                                  }}
                                  className="w-10 text-center text-xs font-extrabold text-slate-900 bg-white border border-slate-200/80 rounded-lg py-0.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
                                  style={{ textAlign: 'center' }}
                                />

                                <button
                                  onClick={() => {
                                    if (item.quantity < maxStock) {
                                      updateQuantity(item.id, item.quantity + 1);
                                    }
                                  }}
                                  disabled={isMaxStockReached}
                                  className="w-6 h-6 flex items-center justify-center rounded-lg bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold shadow-2xs transition"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Prescription Upload Section (Shown if any selected item is Wajib Resep) */}
              {effectiveHasPrescriptionItems && (
                <div className="bg-rose-50/70 rounded-3xl border border-rose-200 p-4 sm:p-5 space-y-3 shadow-stitch">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-rose-900">
                        Pesanan Memerlukan Verifikasi Resep Dokter
                      </h3>
                      <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                        Terdapat obat keras dalam keranjang Anda. Sesuai regulasi BPOM & Kemenkes RI, mohon lampirkan foto resep resmi.
                      </p>
                    </div>
                  </div>

                  {prescriptionPreviewUrl ? (
                    <div className="relative rounded-2xl overflow-hidden border border-rose-300 bg-white p-2">
                      <img
                        src={prescriptionPreviewUrl}
                        alt="Resep Dokter"
                        className="w-full h-40 object-cover rounded-xl"
                      />
                      <button
                        onClick={() => setPrescriptionFile(null)}
                        className="absolute top-3 right-3 p-1.5 bg-black/70 text-white rounded-full hover:bg-black transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="text-[11px] text-slate-700 font-bold mt-2 px-1 flex items-center justify-between">
                        <span>{prescriptionFile?.name || 'resep-dokter.jpg'}</span>
                        <span className="text-emerald-600 font-semibold">✓ Siap Diverifikasi</span>
                      </div>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-rose-300 hover:border-rose-400 bg-white rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer text-center transition">
                      <FileUp className="w-7 h-7 text-rose-500 mb-1" />
                      <span className="text-xs font-bold text-rose-800">
                        Upload Foto Resep Dokter
                      </span>
                      <span className="text-[10px] text-slate-500 mt-0.5">
                        Format JPG, PNG, atau PDF (Maks. 5MB)
                      </span>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  )}

                  <input
                    type="text"
                    value={prescriptionNotes}
                    onChange={(e) => setPrescriptionNotes(e.target.value)}
                    placeholder="Catatan resep (misal: nama dokter / klinik asal)..."
                    className="w-full bg-white border border-rose-200 rounded-xl py-2 px-3 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-400"
                  />
                </div>
              )}
            </div>

            {/* ========================================================================= */}
            {/* GRID 2 (RIGHT): Card Sisanya Semua (Pengiriman, Alamat, Promo, Bayar)     */}
            {/* ========================================================================= */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-4 lg:sticky lg:top-20">
              {/* Alamat Pengiriman Section */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-stitch space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-sky-600" />
                    <h3 className="text-xs font-bold text-slate-900">
                      Alamat Pengiriman
                    </h3>
                  </div>
                  {user && (
                    <button
                      onClick={() => {
                        setIsAddingAddress(false);
                        setIsAddressModalOpen(true);
                      }}
                      className="text-[11px] font-bold text-sky-600 hover:text-sky-700"
                    >
                      Ubah Alamat
                    </button>
                  )}
                </div>

                {!user ? (
                  /* STATE A: NOT LOGGED IN */
                  <div className="bg-amber-50 rounded-2xl p-3.5 border border-amber-200/80 flex flex-col items-start justify-between gap-2.5">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-xs font-bold text-amber-900">Belum Masuk ke Akun</h4>
                        <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                          Silakan masuk untuk memilih alamat pengiriman resmi Anda.
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/account"
                      className="w-full text-center py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition"
                    >
                      Masuk / Daftar
                    </Link>
                  </div>
                ) : selectedAddress ? (
                  /* STATE B: LOGGED IN WITH ADDRESS */
                  <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/70 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {selectedAddress.label} – {selectedAddress.recipient_name}
                      </span>
                      {selectedAddress.is_primary && (
                        <span className="px-1.5 py-0.5 rounded-md bg-sky-600 text-white text-[9px] font-bold">
                          Utama
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      ({selectedAddress.phone})
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">
                      {selectedAddress.address_line}
                      {selectedAddress.subdistrict && `, ${selectedAddress.subdistrict}`}
                      {selectedAddress.city && `, ${selectedAddress.city}`}
                      {selectedAddress.postal_code && ` ${selectedAddress.postal_code}`}
                    </p>
                  </div>
                ) : (
                  /* STATE C: LOGGED IN BUT NO ADDRESS YET */
                  <div className="bg-slate-50 rounded-2xl p-3.5 border border-dashed border-slate-300 text-center space-y-2">
                    <p className="text-xs text-slate-600 font-medium">
                      Belum ada alamat tersimpan di akun Anda.
                    </p>
                    <button
                      onClick={() => {
                        setIsAddingAddress(true);
                        setIsAddressModalOpen(true);
                      }}
                      className="px-4 py-1.5 rounded-xl bg-sky-600 text-white font-bold text-xs shadow-xs hover:bg-sky-700 transition"
                    >
                      + Tambah Alamat Pengiriman
                    </button>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                    <span>💬 Catatan untuk Apoteker / Kurir</span>
                  </label>
                  <input
                    type="text"
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="Contoh: Mohon sertakan plastik klip kedap udara..."
                    className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Opsi Pengiriman Obat */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-stitch space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bike className="w-4 h-4 text-sky-600" />
                    <h3 className="text-xs font-bold text-slate-900">
                      Opsi Pengiriman Obat
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold">
                    Suhu Terjaga
                  </span>
                </div>

                <div className="space-y-2">
                  {/* Option 1: Express Apotek */}
                  <button
                    onClick={() => setDeliveryOption('express')}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-start justify-between ${
                      deliveryOption === 'express'
                        ? 'border-sky-600 bg-sky-50/40 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                          deliveryOption === 'express'
                            ? 'border-sky-600 bg-sky-600 text-white'
                            : 'border-slate-300'
                        }`}
                      >
                        {deliveryOption === 'express' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900">
                            Kurir Express {storeSettings?.store_name || 'Apotek'} {storeSettings?.branch_name || ''}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-sky-600 text-white text-[8px] font-extrabold uppercase">
                            Cepat
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Estimasi 30–45 Menit • Cold/safety pouch
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-900 shrink-0">
                      {effectiveSubtotal >= (storeSettings?.free_delivery_threshold || 100000) && effectiveSubtotal > 0 ? (
                        <span className="text-emerald-600">Gratis (Promo)</span>
                      ) : (
                        formatRupiah(storeSettings?.express_delivery_fee || 10000)
                      )}
                    </span>
                  </button>

                  {/* Option 2: Reguler Sameday */}
                  <button
                    onClick={() => setDeliveryOption('regular')}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-start justify-between ${
                      deliveryOption === 'regular'
                        ? 'border-sky-600 bg-sky-50/40 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                          deliveryOption === 'regular'
                            ? 'border-sky-600 bg-sky-600 text-white'
                            : 'border-slate-300'
                        }`}
                      >
                        {deliveryOption === 'regular' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900">
                          Reguler (Sameday)
                        </span>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Estimasi 2–4 Jam kedatangan
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-900 shrink-0">
                      {formatRupiah(storeSettings?.regular_delivery_fee || 15000)}
                    </span>
                  </button>

                  {/* Option 3: Ambil Sendiri */}
                  <button
                    onClick={() => setDeliveryOption('pickup')}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-start justify-between ${
                      deliveryOption === 'pickup'
                        ? 'border-sky-600 bg-sky-50/40 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
                          deliveryOption === 'pickup'
                            ? 'border-sky-600 bg-sky-600 text-white'
                            : 'border-slate-300'
                        }`}
                      >
                        {deliveryOption === 'pickup' && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900">
                          Ambil Sendiri di Apotek
                        </span>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Siap diambil dalam 15 menit
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 shrink-0">
                      Gratis
                    </span>
                  </button>
                </div>
              </div>

              {/* Voucher & Promo Farmasi Button */}
              <button
                onClick={() => setIsPromoModalOpen(true)}
                className="w-full bg-white rounded-3xl border border-slate-200/80 p-4 shadow-stitch flex items-center justify-between text-left hover:border-sky-300 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
                    <Tag className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        Voucher & Promo Farmasi
                      </span>
                      {appliedPromo && effectivePromoDiscount > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-bold">
                          1 Digunakan
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-semibold mt-0.5">
                      {appliedPromo && effectivePromoDiscount > 0 ? (
                        <span className="text-emerald-700">{appliedPromo.code} • Hemat {formatRupiah(effectivePromoDiscount)}</span>
                      ) : appliedPromo && effectivePromoDiscount === 0 ? (
                        <span className="text-amber-700">{appliedPromo.code} • Min. belanja {formatRupiah(appliedPromo.min_order_amount)}</span>
                      ) : (
                        <span className="text-sky-700">Gunakan voucher promo hemat</span>
                      )}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>

              {/* Metode Pembayaran */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-4 shadow-stitch space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-sky-600" />
                    <h3 className="text-xs font-bold text-slate-900">
                      Metode Pembayaran
                    </h3>
                  </div>
                  <span className="text-[11px] font-bold text-sky-600">Pilih</span>
                </div>

                <div className="space-y-2.5">
                  {/* 1. QRIS Option */}
                  {isQrisAvailable && (
                    <div className={`rounded-2xl border transition overflow-hidden ${
                      paymentMethod === 'qris'
                        ? 'border-sky-600 bg-sky-50/30'
                        : 'border-slate-200 bg-white'
                    }`}>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('qris')}
                        className="w-full p-3 flex items-center justify-between transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-7 rounded-lg bg-sky-100 border border-sky-200 flex items-center justify-center font-extrabold text-[10px] text-sky-800">
                            QRIS
                          </div>
                          <div className="text-left">
                            <div className="text-xs font-bold text-slate-900">
                              QRIS / GoPay / OVO / ShopeePay
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Konfirmasi Instan Bebas Biaya Layanan
                            </div>
                          </div>
                        </div>
                        <ShieldCheck
                          className={`w-4 h-4 ${
                            paymentMethod === 'qris' ? 'text-sky-600' : 'text-slate-300'
                          }`}
                        />
                      </button>

                      {paymentMethod === 'qris' && (
                        <div className="px-3 pb-3.5 pt-1 border-t border-sky-100/80 bg-white/70 space-y-2 text-center">
                          <p className="text-[11px] text-slate-600">
                            Scan barcode QRIS apotek di bawah dengan aplikasi m-Banking atau e-Wallet pilihan Anda:
                          </p>
                          {storeSettings?.qris_image_url ? (
                            <div className="py-2 flex flex-col items-center justify-center">
                              <img
                                src={storeSettings.qris_image_url}
                                alt="Barcode QRIS Apotek"
                                className="w-44 h-44 object-contain rounded-2xl bg-white p-2 border border-slate-200 shadow-sm"
                              />
                              <span className="text-[10px] font-bold text-slate-500 mt-1">
                                {storeSettings.store_name || 'Apotek Jabat'} • QRIS Resmi
                              </span>
                            </div>
                          ) : (
                            <div className="py-4 px-3 bg-sky-50 rounded-2xl border border-sky-100 flex flex-col items-center text-center">
                              <QrCode className="w-10 h-10 text-sky-600 mb-1" />
                              <span className="text-xs font-bold text-sky-900">QRIS Resmi {storeSettings?.store_name || 'Apotek Jabat'}</span>
                              <span className="text-[10px] text-slate-500 mt-0.5">Barcode QRIS akan ditampilkan juga pada halaman instruksi pesanan.</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. Bank Transfer Option (Multi-Account) */}
                  {isBankTransferAvailable && (
                    <div className={`rounded-2xl border transition overflow-hidden ${
                      paymentMethod === 'bank_transfer'
                        ? 'border-sky-600 bg-sky-50/30'
                        : 'border-slate-200 bg-white'
                    }`}>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('bank_transfer')}
                        className="w-full p-3 flex items-center justify-between transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-7 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center font-bold text-[10px] text-emerald-800">
                            BANK
                          </div>
                          <div className="text-left">
                            <div className="text-xs font-bold text-slate-900">
                              Transfer Bank ({bankAccounts.length} Rekening)
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {bankAccounts[0]?.bank_name || 'Transfer via m-Banking/ATM'}
                            </div>
                          </div>
                        </div>
                        <ShieldCheck
                          className={`w-4 h-4 ${
                            paymentMethod === 'bank_transfer' ? 'text-sky-600' : 'text-slate-300'
                          }`}
                        />
                      </button>

                      {paymentMethod === 'bank_transfer' && (
                        <div className="px-3 pb-3.5 pt-1 border-t border-sky-100/80 bg-white/70 space-y-2">
                          <p className="text-[11px] text-slate-600">
                            Silakan transfer ke salah satu rekening resmi apotek:
                          </p>
                          <div className="space-y-2 pt-1">
                            {bankAccounts.map((acc, idx) => (
                              <div
                                key={acc.id || idx}
                                className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0">
                                  <div className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.5 bg-slate-100 rounded-md text-[10px] text-slate-700 font-bold border border-slate-200">
                                      {acc.bank_name.split(' ')[0]}
                                    </span>
                                    <span className="truncate">{acc.bank_name}</span>
                                  </div>
                                  <div className="text-xs font-mono font-bold text-sky-700 mt-1 select-all">
                                    {acc.account_number}
                                  </div>
                                  <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                                    a.n. <span className="font-semibold text-slate-700">{acc.account_holder}</span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleCopyAccount(acc.id || String(idx), acc.account_number)}
                                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 transition ${
                                    copiedBankId === (acc.id || String(idx))
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {copiedBankId === (acc.id || String(idx)) ? (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      <span>Tersalin</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span>Salin</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. COD Option */}
                  {isCodAvailable && (
                    <div className={`rounded-2xl border transition overflow-hidden ${
                      paymentMethod === 'cod'
                        ? 'border-sky-600 bg-sky-50/30'
                        : 'border-slate-200 bg-white'
                    }`}>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cod')}
                        className="w-full p-3 flex items-center justify-between transition"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-7 rounded-lg bg-orange-100 border border-orange-200 flex items-center justify-center font-bold text-[10px] text-orange-800">
                            COD
                          </div>
                          <div className="text-left">
                            <div className="text-xs font-bold text-slate-900">
                              Bayar di Tempat (COD)
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Bayar tunai saat kurir apotek tiba di rumah
                            </div>
                          </div>
                        </div>
                        <ShieldCheck
                          className={`w-4 h-4 ${
                            paymentMethod === 'cod' ? 'text-sky-600' : 'text-slate-300'
                          }`}
                        />
                      </button>

                      {paymentMethod === 'cod' && (
                        <div className="px-3 pb-3.5 pt-1 border-t border-sky-100/80 bg-white/70">
                          <p className="text-[11px] text-slate-600">
                            💵 Siapkan uang pas saat kurir resmi apotek tiba di alamat Anda.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {!isQrisAvailable && !isBankTransferAvailable && !isCodAvailable && (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-800 text-center">
                      Metode pembayaran sedang tidak tersedia atau dinonaktifkan oleh apotek.
                    </div>
                  )}
                </div>
              </div>

              {/* Rincian Pembayaran Breakdown & Desktop Pay Button */}
              <div className="bg-white rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-stitch space-y-3">
                <h3 className="text-xs font-bold text-slate-900 pb-1.5 border-b border-slate-100">
                  Rincian Pembayaran
                </h3>

                <div className="flex justify-between text-xs text-slate-600">
                  <span>Total Harga Produk ({validSelectedCount} item)</span>
                  <span className="font-semibold text-slate-900">
                    {formatRupiah(effectiveGrossProductTotal)}
                  </span>
                </div>

                {effectiveProductDiscountTotal > 0 && (
                  <div className="flex justify-between text-xs text-emerald-600 font-medium">
                    <span>Total Diskon Produk</span>
                    <span>-{formatRupiah(effectiveProductDiscountTotal)}</span>
                  </div>
                )}

                <div className="flex justify-between text-xs text-slate-600">
                  <span>
                    Ongkos Kirim ({deliveryOption === 'express' ? 'Kurir Express' : deliveryOption === 'regular' ? 'Reguler' : 'Ambil Sendiri'})
                  </span>
                  <span className="font-semibold text-slate-900">
                    {effectiveDeliveryFee === 0 ? 'Gratis' : formatRupiah(effectiveDeliveryFee)}
                  </span>
                </div>

                {appliedPromo && effectivePromoDiscount > 0 && (
                  <div className="flex justify-between text-xs text-emerald-600 font-bold bg-emerald-50/60 p-2 rounded-xl border border-emerald-200/70">
                    <span>Diskon Voucher ({appliedPromo.code})</span>
                    <span>-{formatRupiah(effectivePromoDiscount)}</span>
                  </div>
                )}
                {appliedPromo && effectivePromoDiscount === 0 && (
                  <div className="flex justify-between text-xs text-amber-600 font-medium bg-amber-50/50 p-2 rounded-xl border border-amber-200/50">
                    <span>Voucher ({appliedPromo.code})</span>
                    <span className="text-[10px]">Min. belanja {formatRupiah(appliedPromo.min_order_amount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    Biaya Layanan & Segel Pengaman
                    <Info className="w-3 h-3 text-slate-400" />
                  </span>
                  <span className="font-semibold text-emerald-600">
                    <span className="text-slate-400 line-through text-[10px] mr-1">
                      Rp 2.000
                    </span>
                    Gratis
                  </span>
                </div>

                {unavailableItemsCount > 0 && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>{unavailableItemsCount} item tidak tersedia</strong> dalam keranjang telah dikeluarkan dari total tagihan.
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-sm font-extrabold text-slate-900">
                  <span>Total Tagihan</span>
                  <span className="text-lg font-extrabold text-sky-700">{formatRupiah(effectiveTotal)}</span>
                </div>

                {/* Desktop Checkout Action Button */}
                <div className="hidden lg:block pt-2">
                  <button
                    onClick={handleCheckout}
                    disabled={isPlacingOrder || validSelectedCount === 0 || isValidatingCart}
                    className="w-full py-3.5 px-4 rounded-2xl bg-sky-600 hover:bg-sky-700 active:scale-[0.98] disabled:bg-slate-300 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-600/25 transition"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {isPlacingOrder
                        ? 'Memproses Pesanan...'
                        : isValidatingCart
                        ? 'Memeriksa Ketersediaan...'
                        : `Bayar Sekarang (${validSelectedCount})`}
                    </span>
                  </button>
                  <p className="text-[10px] text-slate-400 text-center mt-2">
                    🔒 Transaksi aman & diawasi apoteker berizin resmi.
                  </p>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center my-6 shadow-stitch">
            <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
              <Building className="w-8 h-8" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">Keranjang Masih Kosong</h4>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Yuk jelajahi berbagai obat dan kebutuhan kesehatan resmi farmasi kami.
            </p>
            <Link
              href="/products"
              className="inline-block px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition"
            >
              Belanja Sekarang
            </Link>
          </div>
        )}
      </main>

      {/* Sticky Bottom Checkout Bar (Only shown on Mobile screens < lg when cart has items) */}
      {items.length > 0 && (
        <div className="block lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 p-3.5 shadow-2xl">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button onClick={toggleSelectAll} className="p-0.5">
                {allSelected ? (
                  <CheckSquare className="w-4 h-4 text-sky-600 fill-sky-100" />
                ) : (
                  <Square className="w-4 h-4 text-slate-300" />
                )}
              </button>
              <div>
                <div className="text-[10px] text-slate-400 font-medium">
                  Total:{' '}
                  <span className="text-xs font-extrabold text-sky-700">
                    {formatRupiah(effectiveTotal)}
                  </span>
                </div>
                <div className="text-[10px] text-emerald-600 font-semibold">
                  Hemat {formatRupiah(effectiveProductDiscountTotal + effectivePromoDiscount)}
                </div>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={isPlacingOrder || validSelectedCount === 0 || isValidatingCart}
              className="flex-1 max-w-[180px] py-3.5 px-4 rounded-2xl bg-sky-600 hover:bg-sky-700 active:scale-95 disabled:bg-slate-300 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-600/25 transition"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>
                {isPlacingOrder
                  ? 'Memproses...'
                  : isValidatingCart
                  ? 'Memeriksa...'
                  : `Bayar (${validSelectedCount})`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Address Selection & Management Modal */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-600" />
                <span>{isAddingAddress ? 'Tambah Alamat Baru' : 'Pilih Alamat Pengiriman'}</span>
              </h3>
              <button
                onClick={() => {
                  setIsAddressModalOpen(false);
                  setIsAddingAddress(false);
                }}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {!isAddingAddress ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setIsAddingAddress(true)}
                  className="w-full py-2.5 px-3 rounded-2xl border-2 border-dashed border-sky-300 text-sky-600 hover:bg-sky-50 text-xs font-bold flex items-center justify-center gap-1.5 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Alamat Baru</span>
                </button>

                {addresses.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">
                    Belum ada alamat tersimpan. Silakan tambahkan alamat baru.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {addresses.map((addr) => {
                      const isSelected = selectedAddress?.id === addr.id;
                      return (
                        <div
                          key={addr.id}
                          onClick={() => {
                            setSelectedAddress(addr);
                            setIsAddressModalOpen(false);
                          }}
                          className={`p-3.5 rounded-2xl border cursor-pointer transition text-left ${
                            isSelected
                              ? 'border-sky-600 bg-sky-50/50 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">
                                {addr.label} – {addr.recipient_name}
                              </span>
                              {addr.is_primary && (
                                <span className="px-1.5 py-0.2 rounded bg-sky-600 text-white text-[9px] font-bold">
                                  Utama
                                </span>
                              )}
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-sky-600" />
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {addr.phone}
                          </div>
                          <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                            {addr.address_line}
                            {addr.subdistrict && `, ${addr.subdistrict}`}
                            {addr.city && `, ${addr.city}`}
                            {addr.postal_code && ` ${addr.postal_code}`}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Add New Address Form */
              <form onSubmit={handleSaveNewAddress} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Label Alamat
                  </label>
                  <div className="flex gap-2">
                    {['Rumah', 'Kantor', 'Apartemen', 'Lainnya'].map((lbl) => (
                      <button
                        type="button"
                        key={lbl}
                        onClick={() => setNewLabel(lbl)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                          newLabel === lbl
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {lbl}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Penerima *
                  </label>
                  <input
                    type="text"
                    required
                    value={newRecipientName}
                    onChange={(e) => setNewRecipientName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor WhatsApp / Telepon *
                  </label>
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="0812-3456-7890"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Alamat Lengkap & Nomor Rumah *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={newAddressLine}
                    onChange={(e) => setNewAddressLine(e.target.value)}
                    placeholder="Nama jalan, RT/RW, nomor rumah, blok..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Kecamatan / Kelurahan
                    </label>
                    <input
                      type="text"
                      value={newSubdistrict}
                      onChange={(e) => setNewSubdistrict(e.target.value)}
                      placeholder="Tebet Barat"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Kota
                    </label>
                    <input
                      type="text"
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      placeholder="Jakarta Selatan"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Kode Pos
                    </label>
                    <input
                      type="text"
                      value={newPostalCode}
                      onChange={(e) => setNewPostalCode(e.target.value)}
                      placeholder="12810"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Patokan / Catatan
                    </label>
                    <input
                      type="text"
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="Pagar hitam..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingAddress(false)}
                    className="w-1/3 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingAddress}
                    className="w-2/3 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs disabled:opacity-50"
                  >
                    {isSavingAddress ? 'Menyimpan...' : 'Simpan Alamat'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Promo Modal */}
      {isPromoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Gunakan Voucher Promo
              </h3>
              <button
                onClick={() => setIsPromoModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {appliedPromo && (
                <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-emerald-800 font-mono">
                      ✓ {appliedPromo.code} Aktif
                    </span>
                    <p className="text-[10px] text-emerald-700 mt-0.5">
                      Potongan {formatRupiah(appliedPromo.discount_value)}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      removePromo();
                      setIsPromoModalOpen(false);
                    }}
                    className="text-[10px] font-bold text-rose-600 hover:text-rose-700 px-2 py-1 bg-white rounded-lg border border-rose-200 shadow-2xs"
                  >
                    Lepas Voucher
                  </button>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoInput}
                  onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                  placeholder="Ketik kode promo (misal: HEMATSEHAT)..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs uppercase font-bold focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <button
                  onClick={handleApplyPromo}
                  className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-xl shadow-xs"
                >
                  Terapkan
                </button>
              </div>
              {promoError && (
                <p className="text-[10px] text-rose-600 font-semibold">{promoError}</p>
              )}
            </div>

            {/* Available Vouchers */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-700">
                Voucher Tersedia:
              </span>
              {availablePromotions.length === 0 ? (
                <p className="text-xs text-slate-400 py-2 text-center">
                  Tidak ada voucher yang dapat digunakan saat ini.
                </p>
              ) : (
                availablePromotions.map((p: Promotion) => {
                  const isCurrent = appliedPromo?.code === p.code;
                  return (
                    <div
                      key={p.id}
                      className={`p-3 rounded-2xl border transition flex items-center justify-between ${
                        isCurrent
                          ? 'border-emerald-300 bg-emerald-50/50'
                          : 'border-dashed border-sky-300 bg-sky-50/50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-extrabold text-sky-800 font-mono">
                            {p.code}
                          </span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-600 text-white text-[8px] font-bold">
                              Dipakai
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-600 mt-0.5">{p.description}</p>
                      </div>
                      <button
                        onClick={() => {
                          applyPromo(p.code);
                          setIsPromoModalOpen(false);
                        }}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg ${
                          isCurrent
                            ? 'bg-emerald-600 text-white'
                            : 'bg-sky-600 hover:bg-sky-700 text-white'
                        }`}
                      >
                        {isCurrent ? 'Terpasang' : 'Pakai'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
