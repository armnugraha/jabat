'use client';

import React, { useState, useEffect } from 'react';
import { Product, ProductVariant } from '@/lib/types';
import { formatRupiah } from '@/lib/utils';
import { useCart } from '@/lib/store/cart-context';
import { X, Check, ShoppingBag, ShieldAlert, Plus, Minus } from 'lucide-react';

interface ProductVariantSelectorProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onAdded?: () => void;
}

export const ProductVariantSelector: React.FC<ProductVariantSelectorProps> = ({
  product,
  isOpen,
  onClose,
  onAdded,
}) => {
  const { addItem } = useCart();
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(
    product.variants[0] || {}
  );
  const [quantity, setQuantity] = useState(1);

  const maxStock = selectedVariant.stock || 0;
  const isOutOfStock = maxStock <= 0;

  // Adjust quantity if switching to a variant with lower stock
  useEffect(() => {
    if (maxStock > 0 && quantity > maxStock) {
      setQuantity(maxStock);
    }
  }, [selectedVariant, maxStock]);

  if (!isOpen) return null;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    const finalQty = Math.min(Math.max(1, quantity), maxStock);
    addItem(product, selectedVariant, finalQty);
    if (onAdded) onAdded();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs transition-opacity p-0 sm:p-4">
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl animate-in slide-in-from-bottom-5 duration-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <img
              src={product.image_url}
              alt={product.name}
              className="w-16 h-16 rounded-2xl object-contain bg-slate-50 border border-slate-200 p-1"
            />
            <div>
              <span className="text-[10px] font-bold text-sky-600 uppercase tracking-wider">
                {product.manufacturer || 'Apotek Sehat Mandiri'}
              </span>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-1">
                {product.name}
              </h3>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-base font-extrabold text-sky-700">
                  {formatRupiah(selectedVariant.price)}
                </span>
                {typeof selectedVariant.strike_price === 'number' && selectedVariant.strike_price > selectedVariant.price && (
                  <span className="text-xs text-slate-400 line-through">
                    {formatRupiah(selectedVariant.strike_price)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Prescription Notice if applicable */}
        {product.requires_prescription && (
          <div className="my-3 p-2.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700 text-xs">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-500" />
            <span>Obat Keras: Memerlukan resep dokter saat checkout.</span>
          </div>
        )}

        {/* Variant Selector List */}
        <div className="my-4">
          <label className="block text-xs font-bold text-slate-900 mb-2">
            Pilih Kemasan / Satuan:
          </label>
          <div className="space-y-2">
            {product.variants.map((v) => {
              const isSelected = selectedVariant.id === v.id;
              const vOutOfStock = (v.stock || 0) <= 0;

              return (
                <button
                  key={v.id}
                  onClick={() => setSelectedVariant(v)}
                  className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-sky-600 bg-sky-50/50 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? 'border-sky-600 bg-sky-600 text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {v.name}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {v.quantity_per_package} {v.unit} •{' '}
                        {vOutOfStock ? (
                          <span className="text-rose-600 font-bold">Stok Habis</span>
                        ) : (
                          <span className="text-emerald-700 font-medium">Sisa Stok: {v.stock}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-extrabold text-sky-700">
                      {formatRupiah(v.price)}
                    </div>
                    {typeof v.strike_price === 'number' && v.strike_price > v.price && (
                      <div className="text-[10px] text-slate-400 line-through">
                        {formatRupiah(v.strike_price)}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quantity Controls */}
        <div className="flex items-center justify-between py-3 border-t border-slate-100 mb-4">
          <div>
            <span className="text-xs font-bold text-slate-700 block">Jumlah Kemasan:</span>
            <span className="text-[10px] text-slate-400">
              Maksimal {maxStock} sesuai stok
            </span>
          </div>

          <div className="flex items-center gap-1.5 border border-slate-200 rounded-xl p-1 bg-slate-50">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1 || isOutOfStock}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold shadow-2xs"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            {/* Manual Typing Quantity Input */}
            <input
              type="number"
              min="1"
              max={maxStock}
              disabled={isOutOfStock}
              value={isOutOfStock ? 0 : quantity}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (isNaN(val) || val < 1) {
                  setQuantity(1);
                } else {
                  setQuantity(Math.min(val, maxStock));
                }
              }}
              className="w-12 text-center text-xs font-extrabold text-slate-900 bg-white border border-slate-200 rounded-lg py-1 focus:outline-none focus:ring-1 focus:ring-sky-500"
              style={{ textAlign: 'center' }}
            />


            <button
              onClick={() => setQuantity((q) => Math.min(q + 1, maxStock))}
              disabled={quantity >= maxStock || isOutOfStock}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 text-xs font-bold shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className="w-full py-3.5 px-4 rounded-2xl bg-sky-600 hover:bg-sky-700 disabled:bg-slate-300 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-600/25 transition active:scale-[0.99]"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>
            {isOutOfStock
              ? 'Stok Habis'
              : `Tambah ke Keranjang • ${formatRupiah(selectedVariant.price * quantity)}`}
          </span>
        </button>
      </div>
    </div>
  );
};
