import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const bucket = (formData.get('bucket') as string) || 'products';

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File gambar wajib diunggah.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileExt = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `${fileName}`;

    if (isSupabaseConfigured()) {
      try {
        // Ensure bucket exists or attempt upload
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, buffer, {
            contentType: file.type || 'image/jpeg',
            upsert: true,
          });

        if (!uploadError && uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(uploadData.path);

          if (publicUrlData?.publicUrl) {
            return NextResponse.json({
              success: true,
              url: publicUrlData.publicUrl,
              message: 'Foto berhasil diunggah ke Supabase Storage',
            });
          }
        } else if (uploadError) {
          console.warn('Supabase storage upload error:', uploadError.message);
        }
      } catch (storageErr) {
        console.warn('Supabase storage exception:', storageErr);
      }
    }

    // Fallback: Convert to Base64 Data URL
    const mimeType = file.type || 'image/jpeg';
    const base64Data = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    return NextResponse.json({
      success: true,
      url: dataUrl,
      message: 'Foto berhasil diproses',
    });
  } catch (err: any) {
    console.error('Upload API error:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal mengunggah file' },
      { status: 500 }
    );
  }
}
