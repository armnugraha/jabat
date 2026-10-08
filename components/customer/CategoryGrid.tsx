'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Pill, Sparkles, Activity, Heart, Stethoscope, Tag } from 'lucide-react';
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
  const [categories, setCategories] = useState<Category[]>(
    initialCategories || mockCategories
  );

  useEffect(() => {
    if (initialCategories && initialCategories.length > 0) {
      setCategories(initialCategories);
      return;
    }

    // Fetch from API
    fetch('/api/categories')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setCategories(json.data);
        }
      })
      .catch((err) => console.error('Error fetching categories:', err));
  }, [initialCategories]);

  const getCategoryIcon = (iconName?: string) => {
    switch (iconName) {
      case 'pill':
        return <Pill className="w-5 h-5 text-emerald-600" />;
      case 'sparkles':
        return <Sparkles className="w-5 h-5 text-sky-600" />;
      case 'activity':
        return <Activity className="w-5 h-5 text-amber-600" />;
      case 'heart':
        return <Heart className="w-5 h-5 text-rose-500" />;
      case 'stethoscope':
        return <Stethoscope className="w-5 h-5 text-cyan-600" />;
      case 'tag':
        return <Tag className="w-5 h-5 text-orange-500" />;
      default:
        return <Pill className="w-5 h-5 text-sky-600" />;
    }
  };

  const getBgColor = (iconName?: string) => {
    switch (iconName) {
      case 'pill':
        return 'bg-emerald-50 border-emerald-100 group-hover:bg-emerald-100/70';
      case 'sparkles':
        return 'bg-sky-50 border-sky-100 group-hover:bg-sky-100/70';
      case 'activity':
        return 'bg-amber-50 border-amber-100 group-hover:bg-amber-100/70';
      case 'heart':
        return 'bg-rose-50 border-rose-100 group-hover:bg-rose-100/70';
      case 'stethoscope':
        return 'bg-cyan-50 border-cyan-100 group-hover:bg-cyan-100/70';
      case 'tag':
        return 'bg-orange-50 border-orange-100 group-hover:bg-orange-100/70';
      default:
        return 'bg-slate-50 border-slate-100';
    }
  };

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
                cat.icon
              )}`}
            >
              {getCategoryIcon(cat.icon)}
            </div>
            <h4 className="text-xs font-bold text-slate-800 line-clamp-1">
              {cat.name}
            </h4>
            <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
              {cat.description}
            </p>
          </Link>
        );
      })}
    </div>
  );
};
