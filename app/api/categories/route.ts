import { NextRequest, NextResponse } from 'next/server';
import { mockCategories } from '@/lib/data/mock-data';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';

// In-memory store fallback when Supabase is not connected
let dynamicCategories = [...mockCategories];

export async function GET(request: NextRequest) {
  try {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (!error && data && data.length > 0) {
        return NextResponse.json({
          success: true,
          data,
          source: 'supabase',
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: dynamicCategories,
      source: 'local_database',
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Gagal mengambil data kategori',
        data: dynamicCategories,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, icon } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Nama kategori wajib diisi' },
        { status: 400 }
      );
    }

    const newCategory = {
      id: `c-${Date.now()}`,
      name: name.trim(),
      slug: name.trim().toLowerCase().replace(/\s+/g, '-'),
      description: description || 'Kategori Farmasi',
      icon: icon || 'pill',
      is_active: true,
      display_order: dynamicCategories.length + 1,
    };

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('categories')
        .insert([newCategory])
        .select()
        .single();

      if (!error && data) {
        return NextResponse.json({
          success: true,
          data,
          message: 'Kategori berhasil ditambahkan ke Supabase',
        });
      }
    }

    dynamicCategories.push(newCategory);
    return NextResponse.json({
      success: true,
      data: newCategory,
      message: 'Kategori berhasil ditambahkan',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal menyimpan kategori' },
      { status: 500 }
    );
  }
}
