import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { getSupabaseClientFromRequest, getSupabaseAdminClient, isJwtExpiredError } from '@/lib/supabase/server';
import { CustomerAddress } from '@/lib/types';
import { mockCustomerAddress } from '@/lib/data/mock-data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'CDN-Cache-Control': 'no-store',
  Pragma: 'no-cache',
  Expires: '0',
};

// Local store fallback
let dynamicAddresses: CustomerAddress[] = [mockCustomerAddress];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId parameter is required' },
        { status: 400, headers: noCacheHeaders }
      );
    }

    if (isSupabaseConfigured()) {
      const adminClient = await getSupabaseAdminClient();
      const { data, error } = await adminClient
        .from('customer_addresses')
        .select('*')
        .eq('customer_id', userId)
        .order('is_primary', { ascending: false });

      if (error) {
        console.error('Supabase address fetch error:', error);
      } else if (data) {
        return NextResponse.json(
          {
            success: true,
            data,
            source: 'supabase',
          },
          { headers: noCacheHeaders }
        );
      }
    }

    const userAddresses = dynamicAddresses.filter(
      (a) => a.customer_id === userId || a.customer_id === 'user-budi'
    );

    return NextResponse.json(
      {
        success: true,
        data: userAddresses,
        source: 'local_database',
      },
      { headers: noCacheHeaders }
    );
  } catch (err: any) {
    console.error('Address GET exception:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal mengambil alamat pengiriman' },
      { status: 500, headers: noCacheHeaders }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const customerId = body.customerId || body.customer_id;
    const label = body.label || 'Rumah';
    const recipientName = body.recipientName || body.recipient_name;
    const phone = body.phone;
    const addressLine = body.addressLine || body.address_line;
    const subdistrict = body.subdistrict;
    const district = body.district;
    const city = body.city || 'Jakarta Selatan';
    const postalCode = body.postalCode || body.postal_code;
    const deliveryNotes = body.deliveryNotes || body.delivery_notes;
    const isPrimary = body.isPrimary !== undefined ? Boolean(body.isPrimary) : Boolean(body.is_primary);

    if (!customerId || !recipientName || !phone || !addressLine) {
      return NextResponse.json(
        { success: false, error: 'Nama penerima, nomor telepon, dan alamat lengkap wajib diisi.' },
        { status: 400, headers: noCacheHeaders }
      );
    }

    const newId = crypto.randomUUID();

    if (isSupabaseConfigured()) {
      const adminClient = await getSupabaseAdminClient();

      // 1. Ensure profile exists in profiles table so foreign key constraint is satisfied
      try {
        await adminClient.from('profiles').upsert(
          {
            id: customerId,
            full_name: recipientName,
            phone: phone,
            role: 'customer',
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id', ignoreDuplicates: true }
        );
      } catch (profErr) {
        console.warn('Profile auto-provision notice on address create:', profErr);
      }

      // 2. If primary, reset all previous primary addresses for this customer
      if (isPrimary) {
        await adminClient
          .from('customer_addresses')
          .update({ is_primary: false })
          .eq('customer_id', customerId);
      }

      // 3. Insert address into Supabase
      const { data, error } = await adminClient
        .from('customer_addresses')
        .insert([
          {
            id: newId,
            customer_id: customerId,
            label,
            recipient_name: recipientName,
            phone,
            address_line: addressLine,
            subdistrict: subdistrict || null,
            district: district || null,
            city: city || 'Jakarta Selatan',
            postal_code: postalCode || null,
            delivery_notes: deliveryNotes || null,
            is_primary: Boolean(isPrimary),
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Supabase address insert error:', error);
        return NextResponse.json(
          { success: false, error: error.message || 'Gagal menyimpan alamat ke Supabase' },
          { status: 500, headers: noCacheHeaders }
        );
      }

      if (data) {
        return NextResponse.json(
          {
            success: true,
            data,
            message: 'Alamat pengiriman berhasil ditambahkan ke Supabase',
          },
          { headers: noCacheHeaders }
        );
      }
    }

    const newAddress: CustomerAddress = {
      id: newId,
      customer_id: customerId,
      label,
      recipient_name: recipientName,
      phone,
      address_line: addressLine,
      subdistrict,
      district,
      city,
      postal_code: postalCode,
      delivery_notes: deliveryNotes,
      is_primary: Boolean(isPrimary),
    };

    if (isPrimary) {
      dynamicAddresses = dynamicAddresses.map((a) =>
        a.customer_id === customerId ? { ...a, is_primary: false } : a
      );
    }

    dynamicAddresses.unshift(newAddress);

    return NextResponse.json({
      success: true,
      data: newAddress,
      message: 'Alamat pengiriman berhasil disimpan',
    });
  } catch (err: any) {
    if (isJwtExpiredError(err)) {
      return NextResponse.json(
        { success: false, error: 'jwt_expired', message: 'Sesi login telah kedaluwarsa.' },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal menyimpan alamat' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const id = body.id;
    const customerId = body.customerId || body.customer_id;
    const label = body.label;
    const recipientName = body.recipientName || body.recipient_name;
    const phone = body.phone;
    const addressLine = body.addressLine || body.address_line;
    const subdistrict = body.subdistrict;
    const district = body.district;
    const city = body.city;
    const postalCode = body.postalCode || body.postal_code;
    const deliveryNotes = body.deliveryNotes || body.delivery_notes;
    const isPrimary = body.isPrimary !== undefined ? Boolean(body.isPrimary) : (body.is_primary !== undefined ? Boolean(body.is_primary) : undefined);

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID alamat wajib disertakan' },
        { status: 400, headers: noCacheHeaders }
      );
    }

    if (isSupabaseConfigured()) {
      const adminClient = await getSupabaseAdminClient();

      // Look up existing address to get its customer_id if not provided
      let effectiveCustomerId = customerId;
      if (!effectiveCustomerId) {
        const { data: existingAddr } = await adminClient
          .from('customer_addresses')
          .select('customer_id')
          .eq('id', id)
          .single();
        if (existingAddr?.customer_id) {
          effectiveCustomerId = existingAddr.customer_id;
        }
      }

      // If making this address primary, first reset all addresses of this customer to is_primary = false
      if (isPrimary && effectiveCustomerId) {
        await adminClient
          .from('customer_addresses')
          .update({ is_primary: false })
          .eq('customer_id', effectiveCustomerId);
      }

      // Prepare partial update payload
      const updatePayload: any = {};
      if (label !== undefined) updatePayload.label = label;
      if (recipientName !== undefined) updatePayload.recipient_name = recipientName;
      if (phone !== undefined) updatePayload.phone = phone;
      if (addressLine !== undefined) updatePayload.address_line = addressLine;
      if (subdistrict !== undefined) updatePayload.subdistrict = subdistrict;
      if (district !== undefined) updatePayload.district = district;
      if (city !== undefined) updatePayload.city = city;
      if (postalCode !== undefined) updatePayload.postal_code = postalCode;
      if (deliveryNotes !== undefined) updatePayload.delivery_notes = deliveryNotes;
      if (isPrimary !== undefined) updatePayload.is_primary = Boolean(isPrimary);

      const { data, error } = await adminClient
        .from('customer_addresses')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Supabase address update error:', error);
        return NextResponse.json(
          { success: false, error: error.message || 'Gagal memperbarui alamat di Supabase' },
          { status: 500, headers: noCacheHeaders }
        );
      }

      if (data) {
        return NextResponse.json(
          {
            success: true,
            data,
            message: 'Alamat berhasil diperbarui di Supabase',
          },
          { headers: noCacheHeaders }
        );
      }
    }

    if (isPrimary) {
      dynamicAddresses = dynamicAddresses.map((a) => {
        if (customerId && a.customer_id === customerId) {
          return { ...a, is_primary: a.id === id };
        }
        return a;
      });
    }

    dynamicAddresses = dynamicAddresses.map((a) => {
      if (a.id === id) {
        return {
          ...a,
          label: label !== undefined ? label : a.label,
          recipient_name: recipientName !== undefined ? recipientName : a.recipient_name,
          phone: phone !== undefined ? phone : a.phone,
          address_line: addressLine !== undefined ? addressLine : a.address_line,
          subdistrict: subdistrict !== undefined ? subdistrict : a.subdistrict,
          district: district !== undefined ? district : a.district,
          city: city !== undefined ? city : a.city,
          postal_code: postalCode !== undefined ? postalCode : a.postal_code,
          delivery_notes: deliveryNotes !== undefined ? deliveryNotes : a.delivery_notes,
          is_primary: isPrimary !== undefined ? Boolean(isPrimary) : a.is_primary,
        };
      }
      return a;
    });

    const updated = dynamicAddresses.find((a) => a.id === id);

    return NextResponse.json(
      {
        success: true,
        data: updated,
        message: 'Alamat berhasil diperbarui',
      },
      { headers: noCacheHeaders }
    );
  } catch (err: any) {
    console.error('Address PUT exception:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal memperbarui alamat' },
      { status: 500, headers: noCacheHeaders }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID alamat wajib disertakan' },
        { status: 400, headers: noCacheHeaders }
      );
    }

    if (isSupabaseConfigured()) {
      const adminClient = await getSupabaseAdminClient();
      const { error } = await adminClient.from('customer_addresses').delete().eq('id', id);
      if (error) {
        return NextResponse.json(
          { success: false, error: error.message || 'Gagal menghapus alamat dari Supabase' },
          { status: 500, headers: noCacheHeaders }
        );
      }
      return NextResponse.json(
        {
          success: true,
          message: 'Alamat berhasil dihapus dari Supabase',
        },
        { headers: noCacheHeaders }
      );
    }

    dynamicAddresses = dynamicAddresses.filter((a) => a.id !== id);

    return NextResponse.json(
      {
        success: true,
        message: 'Alamat berhasil dihapus',
      },
      { headers: noCacheHeaders }
    );
  } catch (err: any) {
    console.error('Address DELETE exception:', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Gagal menghapus alamat' },
      { status: 500, headers: noCacheHeaders }
    );
  }
}


