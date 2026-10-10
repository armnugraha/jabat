'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Pill, Sparkles, Activity, Heart, Stethoscope, Tag, Package, ShieldPlus, Layers } from 'lucide-react';
import { Category } from '@/lib/types';
import { mockCategories } from '@/lib/data/mock-data';

interface CategoryGridProps {
  categories?: Category[];
  selectedCategory?: string;
  onSelectCategory?: (slug: string) => void;
  compact?: boolean;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  categories: initialCategories,
  selectedCategory,
  onSelectCategory,
  compact = false,
}) => {
  const [categories, setCategories] = useState<Category[]>(initialCategories || []);
  const [isLoading, setIsLoading] = useState(!initialCategories || initialCategories.length === 0);

  useEffect(() => {
    if (initialCategories && initialCategories.length > 0) {
      setCategories(initialCategories);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetch('/api/categories')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data && json.data.length > 0) {
          setCategories(json.data);
        } else {
          setCategories(mockCategories);
        }
      })
      .catch((err) => {
        console.error('Error fetching categories:', err);
        setCategories(mockCategories);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [initialCategories]);

  const getCategoryIcon = (cat: Category) => {
    const iconName = cat.icon || '';
    const nameLower = cat.name.toLowerCase();

    if (iconName === 'sparkles' || nameLower.includes('rawat') || nameLower.includes('kulit')) {
      return <Sparkles className="w-5 h-5 text-sky-600" />;
    }
    if (iconName === 'activity' || nameLower.includes('vitamin') || nameLower.includes('suplemen')) {
      return <Activity className="w-5 h-5 text-amber-600" />;
    }
    if (iconName === 'heart' || nameLower.includes('anak') || nameLower.includes('ibu') || nameLower.includes('bayi')) {
      return <Heart className="w-5 h-5 text-rose-500" />;
    }
    if (iconName === 'stethoscope' || nameLower.includes('alat') || nameLower.includes('medis')) {
      return <Stethoscope className="w-5 h-5 text-cyan-600" />;
    }
    if (iconName === 'tag' || nameLower.includes('promo') || nameLower.includes('diskon')) {
      return <Tag className="w-5 h-5 text-orange-500" />;
    }
    if (nameLower.includes('resep') || nameLower.includes('keras')) {
      return <ShieldPlus className="w-5 h-5 text-rose-600" />;
    }
    return <Pill className="w-5 h-5 text-emerald-600" />;
  };

  const getBgColor = (cat: Category) => {
    const iconName = cat.icon || '';
    const nameLower = cat.name.toLowerCase();

    if (iconName === 'sparkles' || nameLower.includes('rawat') || nameLower.includes('kulit')) {
      return 'bg-sky-50 border-sky-100 group-hover:bg-sky-100/70';
    }
    if (iconName === 'activity' || nameLower.includes('vitamin') || nameLower.includes('suplemen')) {
      return 'bg-amber-50 border-amber-100 group-hover:bg-amber-100/70';
    }
    if (iconName === 'heart' || nameLower.includes('anak') || nameLower.includes('ibu') || nameLower.includes('bayi')) {
      return 'bg-rose-50 border-rose-100 group-hover:bg-rose-100/70';
    }
    if (iconName === 'stethoscope' || nameLower.includes('alat') || nameLower.includes('medis')) {
      return 'bg-cyan-50 border-cyan-100 group-hover:bg-cyan-100/70';
    }
    if (iconName === 'tag' || nameLower.includes('promo') || nameLower.includes('diskon')) {
      return 'bg-orange-50 border-orange-100 group-hover:bg-orange-100/70';
    }
    if (nameLower.includes('resep') || nameLower.includes('keras')) {
      return 'bg-rose-50 border-rose-100 group-hover:bg-rose-100/70';
    }
    return 'bg-emerald-50 border-emerald-100 group-hover:bg-emerald-100/70';
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-2.5 md:gap-3.5">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <div
            key={n}
            className="rounded-2xl border border-slate-100 bg-white p-3 flex flex-col items-center text-center animate-pulse"
          >
            <div className="w-11 h-11 rounded-2xl bg-slate-100 mb-2" />
            <div className="h-3 w-16 bg-slate-100 rounded mb-1" />
            <div className="h-2 w-20 bg-slate-50 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-2.5 md:gap-3.5">
      {categories.map((cat) => {
        const isSelected = selectedCategory === cat.slug;
        return (
          <Link
            key={cat.id}
            href={`/products?category=${cat.slug}`}
            className={`group rounded-2xl border p-3 flex flex-col items-center text-center transition-all duration-150 ${
              isSelected
                ? 'border-sky-500 bg-sky-50 shadow-sm'
                : 'border-slate-100 bg-white hover:border-slate-200 shadow-stitch'
            }`}
          >
            <div
              className={`w-11 h-11 rounded-2xl border flex items-center justify-center mb-2 transition ${getBgColor(
                cat
              )}`}
            >
              {getCategoryIcon(cat)}
            </div>
            <h4 className="text-xs font-bold text-slate-800 line-clamp-1">
              {cat.name}
            </h4>
            <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
              {cat.description || 'Kategori Farmasi'}
            </p>
          </Link>
        );
      })}
    </div>
  );
};
