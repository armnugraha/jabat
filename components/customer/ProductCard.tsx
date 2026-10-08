'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Product } from '@/lib/types';
import { formatRupiah } from '@/lib/utils';
import { useCart } from '@/lib/store/cart-context';
import { Heart, Plus, ShieldCheck, Pill } from 'lucide-react';
import { ProductVariantSelector } from './ProductVariantSelector';

interface ProductCardProps {
  product: Product;
  showFavorite?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  showFavorite = false,
}) => {
  const { addItem } = useCart();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);

  const defaultVariant = product.variants[0] || {
    price: 0,
    unit: 'pcs',
    quantity_per_package: 1,
    name: 'Pcs',
  };

  const handlePlusClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (product.variants.length > 1) {
      setIsVariantModalOpen(true);
    } else {
      addItem(product, defaultVariant, 1);
    }
  };

  const hasDiscount =
    defaultVariant.strike_price && defaultVariant.strike_price > defaultVariant.price;

  // Determine badge styling based on category and prescription requirement
  const getBadge = () => {
    if (product.requires_prescription) {
      return {
        label: 'Wajib Resep',
        dotClass: 'bg-rose-500',
        wrapperClass: 'bg-rose-50 text-rose-700 border-rose-200/80',
      };
    }
    if (product.category_id === 'c3') {
      return {
        label: 'Suplemen',
        dotClass: 'bg-blue-500',
        wrapperClass: 'bg-blue-50 text-blue-700 border-blue-200/80',
      };
    }
    if (product.category_id === 'c5') {
      return {
        label: 'Alkes',
        dotClass: 'bg-indigo-500',
        wrapperClass: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
      };
    }
    return {
      label: 'Obat Bebas',
      dotClass: 'bg-emerald-500',
      wrapperClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    };
  };

  const badge = getBadge();

  return (
    <>
      <div className="group bg-white rounded-2xl border border-slate-200/70 p-3 shadow-stitch hover:shadow-stitch-card transition-all duration-200 flex flex-col justify-between relative h-full">
        {/* Top Badges & Favorite */}
        <div className="flex items-center justify-between gap-1 mb-2 z-10">
          <div className="flex items-center gap-1 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.wrapperClass}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${badge.dotClass}`} />
              {badge.label}
            </span>
            {hasDiscount && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-orange-50 text-orange-600 border border-orange-200/70">
                Promo
              </span>
            )}
          </div>

          {showFavorite && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsFavorite(!isFavorite);
              }}
              className="p-1 text-slate-400 hover:text-rose-500 transition"
              aria-label="Simpan Favorit"
            >
              <Heart
                className={`w-4 h-4 ${
                  isFavorite ? 'fill-rose-500 text-rose-500' : ''
                }`}
              />
            </button>
          )}
        </div>

        {/* Product Image Clickable Link */}
        <Link href={`/products/${product.slug || product.id}`} className="block">
          <div className="w-full aspect-square bg-slate-50 rounded-xl mb-2.5 overflow-hidden relative flex items-center justify-center p-2 group-hover:bg-slate-100/70 transition">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition duration-300"
                loading="lazy"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600">
                <Pill className="w-6 h-6" />
              </div>
            )}

            {/* Packaging watermark pill over image */}
            <div className="absolute bottom-1.5 left-1.5 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-md text-[9px] font-semibold text-slate-600 border border-slate-200/60 uppercase">
              {defaultVariant.name} @ {defaultVariant.quantity_per_package} {defaultVariant.unit}
            </div>
          </div>

          {/* Product Titles */}
          <div className="min-h-[44px]">
            <h3 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-sky-600 transition">
              {product.name}
            </h3>
            <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
              {product.indications || product.manufacturer || 'Apotek Sehat Mandiri'}
            </p>
          </div>
        </Link>

        {/* Price and Action Button */}
        <div className="flex items-end justify-between mt-3 pt-2 border-t border-slate-100/80">
          <div>
            {defaultVariant.strike_price && (
              <div className="text-[10px] text-slate-400 line-through">
                {formatRupiah(defaultVariant.strike_price)}
              </div>
            )}
            <div className="text-sm font-bold text-sky-700 leading-tight">
              {formatRupiah(defaultVariant.price)}
            </div>
          </div>

          {/* Solid Blue Add Button */}
          <button
            onClick={handlePlusClick}
            className="w-8 h-8 rounded-full bg-sky-600 hover:bg-sky-700 active:scale-95 text-white flex items-center justify-center shadow-sm shadow-sky-600/30 transition duration-150"
            aria-label="Tambah ke keranjang"
            title={product.variants.length > 1 ? 'Pilih Kemasan' : 'Tambah ke Keranjang'}
          >
            <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Variant Selector Modal when triggered */}
      {isVariantModalOpen && (
        <ProductVariantSelector
          product={product}
          isOpen={isVariantModalOpen}
          onClose={() => setIsVariantModalOpen(false)}
        />
      )}
    </>
  );
};
