'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, ProductVariant, CartItem, DeliveryOption, PaymentMethod, Promotion } from '../types';
import { mockPromotions } from '../data/mock-data';

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, variant: ProductVariant, quantity?: number) => void;
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
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from localStorage / API on mount
  useEffect(() => {
    try {
      const savedAuth = localStorage.getItem('asm_auth_user');
      const userId = savedAuth ? JSON.parse(savedAuth)?.id : null;
      const cartKey = userId ? `asm_cart_${userId}` : 'asm_cart_guest';

      const localCart = localStorage.getItem(cartKey);
      if (localCart) {
        setItems(JSON.parse(localCart));
      }

      if (userId) {
        fetch(`/api/cart?userId=${userId}`)
          .then((res) => res.json())
          .then((json) => {
            if (json.success && json.data && json.data.length > 0) {
              setItems(json.data);
            }
          })
          .catch((err) => console.warn('Cart sync notice:', err));
      }
    } catch (e) {
      console.error('Cart load error:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Save cart to localStorage & API whenever items change
  useEffect(() => {
    if (!isLoaded) return;
    try {
      const savedAuth = localStorage.getItem('asm_auth_user');
      const userId = savedAuth ? JSON.parse(savedAuth)?.id : null;
      const cartKey = userId ? `asm_cart_${userId}` : 'asm_cart_guest';

      localStorage.setItem(cartKey, JSON.stringify(items));

      if (userId) {
        fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, items }),
        }).catch((err) => console.warn('Cart post notice:', err));
      }
    } catch (e) {
      console.error('Cart save error:', e);
    }
  }, [items, isLoaded]);

  const [appliedPromo, setAppliedPromo] = useState<Promotion | null>(mockPromotions[0]); // Default HEMATSEHAT as in design
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

  const addItem = (product: Product, variant: ProductVariant, quantity: number = 1) => {
    setItems((prev) => {
      const itemId = `${product.id}-${variant.id}`;
      const existing = prev.find((item) => item.id === itemId);
      if (existing) {
        return prev.map((item) =>
          item.id === itemId
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { id: itemId, product, variant, quantity, selected: true }];
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

  // Delivery fee logic
  const deliveryFee =
    deliveryOption === 'pickup'
      ? 0
      : deliveryOption === 'express'
      ? 10000
      : 15000;

  // Promo code calculation
  const applyPromo = (code: string) => {
    const found = mockPromotions.find(
      (p) => p.code.toUpperCase() === code.trim().toUpperCase() && p.is_active
    );
    if (!found) {
      return { success: false, message: 'Kode voucher tidak valid atau sudah kedaluwarsa' };
    }
    if (subtotal < found.min_order_amount) {
      return {
        success: false,
        message: `Minimal belanja Rp ${found.min_order_amount.toLocaleString('id-ID')} untuk menggunakan voucher ini`,
      };
    }
    setAppliedPromo(found);
    return { success: true, message: `Voucher ${found.code} berhasil dipasang!` };
  };

  const removePromo = () => {
    setAppliedPromo(null);
  };

  const promoDiscount = appliedPromo && subtotal >= appliedPromo.min_order_amount ? appliedPromo.discount_value : 0;

  const hasPrescriptionItems = selectedItems.some(
    (item) => item.product.requires_prescription
  );

  const total = Math.max(0, subtotal + deliveryFee - promoDiscount);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
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
