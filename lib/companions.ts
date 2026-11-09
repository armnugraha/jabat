import fs from 'fs';
import path from 'path';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { getSupabaseAdminClient } from '@/lib/supabase/server';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'product-companions.json');

function ensureDataFile(): Record<string, string[]> {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify({}), 'utf-8');
      return {};
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

export async function getCompanionProductIds(productId: string): Promise<string[]> {
  if (!productId) return [];

  // 1. Try Supabase if table exists
  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabaseAdminClient();
      const { data, error } = await supabase
        .from('product_companions')
        .select('companion_product_id')
        .eq('product_id', productId);

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map((r: any) => r.companion_product_id);
      }
    } catch (e) {
      // Table may not exist yet in Supabase, fall through to persistent file
    }
  }

  // 2. Read from persistent file
  const store = ensureDataFile();
  return store[productId] || [];
}

export async function setCompanionProductIds(productId: string, companionIds: string[]): Promise<void> {
  if (!productId) return;
  const cleanIds = Array.isArray(companionIds) ? Array.from(new Set(companionIds.filter(Boolean))) : [];

  // 1. Save to persistent file
  try {
    const store = ensureDataFile();
    store[productId] = cleanIds;
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write product companions file:', e);
  }

  // 2. Also try saving to Supabase if table exists
  if (isSupabaseConfigured()) {
    try {
      const supabase = await getSupabaseAdminClient();
      // Delete existing
      await supabase.from('product_companions').delete().eq('product_id', productId);
      // Insert new
      if (cleanIds.length > 0) {
        await supabase.from('product_companions').insert(
          cleanIds.map((cId) => ({
            id: `${productId}_${cId}`,
            product_id: productId,
            companion_product_id: cId,
          }))
        );
      }
    } catch (e) {
      // Table may not exist yet in Supabase
    }
  }
}
