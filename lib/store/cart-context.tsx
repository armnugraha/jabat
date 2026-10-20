'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, ProductVariant, CartItem, DeliveryOption, PaymentMethod, Promotion, StoreSettings, BundlingPackage } from '../types';
import { mockPromotions, mockStoreSettings } from '../data/mock-data';

import { useAuth } from './auth-context';

interface CartContextType {
  items: CartItem[];
  isLoaded: boolean;
  addItem: (product: Product, variant: ProductVariant, quantity?: number, bundleName?: string) => void;
  addBundle: (bundle: BundlingPackage) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  toggleItemSelection: (id: string) => void;
  toggleSelectAll: () => void;
  clearCart: () => void;
  allSelected: boolean;
  itemCount: number;
  selectedCount: number;
  subtotal: number;
  productDiscountTotal: number;
  appliedPromo: Promotion | null;
  applyPromo: (code: string) => { success: boolean; message: string };
  removePromo: () => void;
  promoDiscount: number;
  deliveryOption: DeliveryOption;
  setDeliveryOption: (option: DeliveryOption) => void;
  deliveryFee: number;
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  customerNotes: string;
  setCustomerNotes: (notes: string) => void;
  prescriptionFile: File | null;
  prescriptionPreviewUrl: string | null;
  setPrescriptionFile: (file: File | null) => void;
  hasPrescriptionItems: boolean;
  total: number;
  storeSettings: StoreSettings;
  availablePromotions: Promotion[];
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(mockStoreSettings);
  const [availablePromotions, setAvailablePromotions] = useState<Promotion[]>(mockPromotions);
  const lastLoadedUserIdRef = React.useRef<string | null>(null);

  // Load store settings & promotions from API
  useEffect(() => {
    fetch('/api/store', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setStoreSettings(json.data);
        }
      })
      .catch((err) => console.warn('Store settings sync notice:', err));

    fetch('/api/promotions', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data && json.data.length > 0) {
          setAvailablePromotions(json.data);
        }
      })
      .catch((err) => console.warn('Promotions sync notice:', err));
  }, []);

  // Load cart from API on mount or when auth state is resolved
  useEffect(() => {
    if (isAuthLoading) return;

    const currentUserId = user?.id || 'guest';
    let isCancelled = false;
    setIsLoaded(false);

    // If guest, load from localStorage
    if (currentUserId === 'guest') {
      try {
        const saved = localStorage.getItem('jabat_guest_cart');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setItems(parsed);
          }
        }
      } catch (e) {}
      lastLoadedUserIdRef.current = 'guest';
      setIsLoaded(true);
      return;
    }

    // Authenticated user: Load from Supabase via API
    fetch(`/api/cart?userId=${encodeURIComponent(currentUserId)}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (isCancelled) return;
        let serverItems: CartItem[] = json.success && Array.isArray(json.data) ? json.data : [];

        // Check if there was guest cart in localStorage to merge into Supabase
        try {
          const guestSaved = localStorage.getItem('jabat_guest_cart');
          if (guestSaved) {
            const guestItems = JSON.parse(guestSaved);
            if (Array.isArray(guestItems) && guestItems.length > 0) {
              const merged = [...serverItems];
              for (const gItem of guestItems) {
                const idx = merged.findIndex((m) => m.id === gItem.id);
                if (idx >= 0) {
                  merged[idx].quantity += gItem.quantity;
                } else {
                  merged.push(gItem);
                }
              }
              serverItems = merged;
              localStorage.removeItem('jabat_guest_cart');
              // Sync merged items to Supabase
              fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUserId, items: serverItems }),
              }).catch(() => {});
            }
          }
        } catch (e) {}

        setItems(serverItems);
        lastLoadedUserIdRef.current = currentUserId;
        setIsLoaded(true);
      })
      .catch((err) => {
        console.warn('Cart sync notice:', err);
        if (!isCancelled) {
          lastLoadedUserIdRef.current = currentUserId;
          setIsLoaded(true);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [user?.id, isAuthLoading]);

  // Save cart to API ONLY after loading has completed for the active user
  useEffect(() => {
    if (!isLoaded || isAuthLoading) return;
    const currentUserId = user?.id || 'guest';

    // Prevent saving if the user context hasn't finished loading yet
    if (lastLoadedUserIdRef.current !== currentUserId) return;

    if (currentUserId === 'guest') {
      try {
        localStorage.setItem('jabat_guest_cart', JSON.stringify(items));
      } catch (e) {}
      return;
    }

    // Save to Supabase via API
    fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUserId, items }),
    }).catch((err) => console.warn('Cart post notice:', err));
  }, [items, isLoaded, isAuthLoading, user?.id]);

  const [appliedPromo, setAppliedPromo] = useState<Promotion | null>(null);
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>('express');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('qris');
  const [customerNotes, setCustomerNotes] = useState('Mohon sertakan plastik klip kedap udara & struk resmi farmasi');
  const [prescriptionFile, setPrescriptionFileState] = useState<File | null>(null);
  const [prescriptionPreviewUrl, setPrescriptionPreviewUrl] = useState<string | null>(null);

  const setPrescriptionFile = (file: File | null) => {
    setPrescriptionFileState(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setPrescriptionPreviewUrl(url);
    } else {
      setPrescriptionPreviewUrl(null);
    }
  };

  const addItem = (product: Product, variant: ProductVariant, quantity: number = 1, bundleName?: string) => {
    setItems((prev) => {
      const itemId = `${product.id}-${variant.id}`;
      const existing = prev.find((item) => item.id === itemId);
      if (existing) {
        return prev.map((item) =>
          item.id === itemId
            ? { ...item, quantity: item.quantity + quantity, bundle_name: bundleName || item.bundle_name }
            : item
        );
      }
      return [...prev, { id: itemId, product, variant, quantity, selected: true, bundle_name: bundleName }];
    });
  };

  const addBundle = (bundle: BundlingPackage) => {
    if (!bundle.items || bundle.items.length === 0) return;
    setItems((prev) => {
      const itemsSum = (bundle.items || []).reduce(
        (sum, it) => sum + (Number(it.variant?.price) || 0) * (Number(it.quantity) || 1),
        0
      );
      const origPrice =
        Number(bundle.original_price) > 0 && Number(bundle.original_price) >= Number(bundle.bundle_price)
          ? Number(bundle.original_price)
          : itemsSum > 0
          ? itemsSum
          : Number(bundle.bundle_price);
      const bPrice = Number(bundle.bundle_price) || 0;
      const savAmount = Math.max(0, origPrice - bPrice);
      const savPct = origPrice > 0 ? Math.round((savAmount / origPrice) * 100) : 0;

      const bundleItemId = `bundle-${bundle.id}`;
      const existingIndex = prev.findIndex((item) => item.id === bundleItemId);

      if (existingIndex > -1) {
        return prev.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: item.quantity + 1, selected: true }
            : item
        );
      }

      const synthesizedProduct: Product = {
        id: bundleItemId,
        name: bundle.name,
        slug: bundle.slug || `bundle-${bundle.id}`,
        description: bundle.description,
        image_url:
          bundle.image_url ||
          bundle.items?.[0]?.product?.image_url ||
          'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80',
        requires_prescription: (bundle.items || []).some(
          (bi) => bi.product?.requires_prescription
        ),
        is_active: true,
        is_featured: true,
        variants: [],
        manufacturer: `Paket Farmasi • ${bundle.category}`,
      };

      const synthesizedVariant: ProductVariant = {
        id: `bvar-${bundle.id}`,
        product_id: bundleItemId,
        name: `Paket Lengkap (${bundle.items.length} Macam Obat)`,
        unit: 'paket',
        quantity_per_package: bundle.items.length,
        price: bPrice,
        strike_price: origPrice > bPrice ? origPrice : undefined,
        discount_percentage: savPct,
        stock: 99,
        is_active: true,
      };

      const bundleCartItem: CartItem = {
        id: bundleItemId,
        is_bundle: true,
        bundle: {
          ...bundle,
          original_price: origPrice,
          bundle_price: bPrice,
          savings_amount: savAmount,
          savings_percentage: savPct,
        },
        bundle_name: bundle.name,
        product: synthesizedProduct,
        variant: synthesizedVariant,
        quantity: 1,
        selected: true,
      };

      return [...prev, bundleCartItem];
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const toggleItemSelection = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const allSelected = items.length > 0 && items.every((item) => item.selected);

  const toggleSelectAll = () => {
    const nextState = !allSelected;
    setItems((prev) => prev.map((item) => ({ ...item, selected: nextState })));
  };

  const clearCart = () => {
    setItems([]);
    if (!user) {
      try {
        localStorage.removeItem('jabat_guest_cart');
      } catch (e) {}
    } else {
      fetch(`/api/cart?userId=${encodeURIComponent(user.id)}`, {
        method: 'DELETE',
      }).catch(() => {});
    }
  };

  const selectedItems = items.filter((item) => item.selected);
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const selectedCount = selectedItems.reduce((acc, item) => acc + item.quantity, 0);

  // Subtotal of base strike/original price vs discounted selling price
  const grossProductTotal = selectedItems.reduce(
    (sum, item) => sum + (item.variant.strike_price || item.variant.price) * item.quantity,
    0
  );

  const subtotal = selectedItems.reduce(
    (sum, item) => sum + item.variant.price * item.quantity,
    0
  );

  const productDiscountTotal = grossProductTotal - subtotal;

  // Dynamic Delivery Fee Calculation from Store Settings
  const expressFee = storeSettings.express_delivery_fee ?? 10000;
  const regularFee = storeSettings.regular_delivery_fee ?? 15000;
  const freeThreshold = storeSettings.free_delivery_threshold ?? 100000;

  const deliveryFee =
    deliveryOption === 'pickup'
      ? 0
      : deliveryOption === 'express'
      ? subtotal >= freeThreshold && subtotal > 0
        ? 0
        : expressFee
      : regularFee;

  // Promo code calculation against dynamic available promotions
  const applyPromo = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    const found = availablePromotions.find(
      (p) => p.code.toUpperCase() === cleanCode && (p.is_active !== false)
    );
    if (!found) {
      return { success: false, message: 'Kode voucher tidak valid atau sudah tidak aktif' };
    }
    if (subtotal < (found.min_order_amount || 0)) {
      return {
        success: false,
        message: `Minimal belanja Rp ${(found.min_order_amount || 0).toLocaleString('id-ID')} untuk menggunakan voucher ini`,
      };
    }
    setAppliedPromo(found);
    return { success: true, message: `Voucher ${found.code} berhasil dipasang!` };
  };

  const removePromo = () => {
    setAppliedPromo(null);
  };

  const promoDiscount =
    appliedPromo && subtotal >= (appliedPromo.min_order_amount || 0)
      ? appliedPromo.discount_type === 'percentage'
        ? Math.min(
            Math.round((subtotal * appliedPromo.discount_value) / 100),
            appliedPromo.max_discount || Infinity
          )
        : appliedPromo.discount_value
      : 0;


  const hasPrescriptionItems = selectedItems.some(
    (item) => item.product.requires_prescription
  );

  const total = Math.max(0, subtotal + deliveryFee - promoDiscount);

  return (
    <CartContext.Provider
      value={{
        items,
        isLoaded,
        addItem,
        addBundle,
        updateQuantity,
        removeItem,
        toggleItemSelection,
        toggleSelectAll,
        clearCart,
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
        storeSettings,
        availablePromotions,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

