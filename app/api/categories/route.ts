import { NextRequest, NextResponse } from 'next/server';
import { mockCategories } from '@/lib/data/mock-data';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { getSupabaseAdminClient } from '@/lib/supabase/server';
import { Category } from '@/lib/types';
import { isValidUUID } from '@/lib/utils';

// In-memory store fallback when Supabase is not connected
let dynamicCategories: Category[] = [...mockCategories];

export async function GET(request: NextRequest) {
  try {
    if (isSupabaseConfigured()) {
      const supabase = await getSupabaseAdminClient();
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error('Supabase categories fetch error:', error);
      } else if (data) {
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

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nama kategori wajib diisi' },
        { status: 400 }
      );
    }

    const newCategoryId = crypto.randomUUID();
    const slug = `${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-4)}`;

    const newCategory: Category = {
      id: newCategoryId,
      name: name.trim(),
      slug,
      description: description || 'Kategori Farmasi',
      icon: icon || 'pill',
      is_active: true,
      display_order: dynamicCategories.length + 1,
    };

    if (isSupabaseConfigured()) {
      const supabase = await getSupabaseAdminClient();
      const { data, error } = await supabase
        .from('categories')
        .insert([
          {
            id: newCategory.id,
            name: newCategory.name,
            slug: newCategory.slug,
            description: newCategory.description,
            icon: newCategory.icon,
            is_active: true,
            display_order: newCategory.display_order,
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Supabase category insert error:', error);
        return NextResponse.json(
          { success: false, error: error.message || 'Gagal menyimpan kategori ke Supabase' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data,
        message: 'Kategori berhasil ditambahkan ke Supabase',
      });
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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID kategori wajib disertakan' },
        { status: 400 }
      );
    }

    if (isSupabaseConfigured() && isValidUUID(id)) {
      const supabase = await getSupabaseAdminClient();
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) {
        return NextResponse.json(
          { success: false, error: error.message || 'Gagal menghapus kategori di Supabase' },
          { status: 500 }
        );
      }
      return NextResponse.json({
        success: true,
        message: 'Kategori berhasil dihapus dari Supabase',
      });
    }

    dynamicCategories = dynamicCategories.filter((c) => c.id !== id);

    return NextResponse.json({
      success: true,
      message: 'Kategori berhasil dihapus',
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal menghapus kategori' },
      { status: 500 }
    );
  }
}

