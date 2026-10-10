export type UserRole = 'customer' | 'pharmacist' | 'admin';

export type OrderStatus =
  | 'pending'
  | 'waiting_prescription'
  | 'prescription_review'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled';

export type PaymentStatus =
  | 'pending'
  | 'waiting_confirmation'
  | 'paid'
  | 'failed'
  | 'cancelled';

export type PaymentMethod = 'bank_transfer' | 'qris' | 'cod';

export type DeliveryOption = 'express' | 'regular' | 'pickup';

export type PrescriptionStatus =
  | 'pending'
  | 'approved'
  | 'needs_revision'
  | 'rejected';

export interface UserProfile {
  id: string;
  role: UserRole;
  full_name: string;
  phone?: string;
  email?: string;
  avatar_url?: string;
  sipa_number?: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  is_active: boolean;
  display_order: number;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string; // e.g., 'Tablet', 'Strip', 'Box'
  unit: string; // e.g., 'tablet', 'kaplet', 'ml', 'gram'
  quantity_per_package: number; // e.g., 10 for strip of 10 tablets
  price: number;
  strike_price?: number;
  discount_percentage?: number;
  stock: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  category_id?: string;
  category?: Category;
  requires_prescription: boolean;
  is_active: boolean;
  is_featured: boolean;
  bpom_number?: string;
  manufacturer?: string;
  indications?: string;
  composition?: string;
  dosage?: string;
  precautions?: string;
  storage_instructions?: string;
  image_url: string;
  images?: string[];
  variants: ProductVariant[];
  created_at?: string;
}

export interface CustomerAddress {
  id: string;
  customer_id: string;
  label: string;
  recipient_name: string;
  phone: string;
  address_line: string;
  subdistrict?: string;
  district?: string;
  city: string;
  postal_code?: string;
  delivery_notes?: string;
  is_primary: boolean;
}

export interface Promotion {
  id: string;
  code: string;
  title: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_discount?: number;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
  banner_image?: string;
}

export interface CartItem {
  id: string; // cart item unique key (e.g. `${product.id}-${variant.id}`)
  product: Product;
  variant: ProductVariant;
  quantity: number;
  selected: boolean;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string;
  variant_id?: string;
  product_name_snapshot: string;
  variant_name_snapshot: string;
  unit_snapshot: string;
  quantity_per_package_snapshot: number;
  price_snapshot: number;
  quantity: number;
  discount: number;
  subtotal: number;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_proof_path?: string;
  subtotal: number;
  discount: number;
  delivery_fee: number;
  total: number;
  delivery_option: DeliveryOption;
  delivery_address: {
    label: string;
    recipient_name: string;
    phone: string;
    address_line: string;
    notes?: string;
  };
  customer_note?: string;
  requires_prescription: boolean;
  prescription_status?: PrescriptionStatus;
  prescription_id?: string;
  prescription_file_url?: string;
  items: OrderItem[];
  created_at: string;
  updated_at?: string;
}

export interface Prescription {
  id: string;
  order_id?: string;
  order_number?: string;
  customer_id: string;
  customer_name?: string;
  file_path: string;
  file_url?: string;
  status: PrescriptionStatus;
  pharmacist_id?: string;
  pharmacist_notes?: string;
  reviewed_at?: string;
  created_at: string;
  items?: { product_name: string; quantity: number }[];
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: UserRole;
  sender_name: string;
  message: string;
  attachment_path?: string;
  attachment_url?: string;
  recommended_product?: Product;
  is_read: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_avatar?: string;
  assigned_pharmacist_id?: string;
  pharmacist_name?: string;
  order_id?: string;
  status: 'open' | 'closed';
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder: string;
}

export interface StoreSettings {
  id: string;
  store_name: string;
  tagline: string;
  branch_name: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  maps_url?: string;
  pharmacist_name: string;
  pharmacist_sipa: string;
  is_open: boolean;
  opening_time: string;
  closing_time: string;
  express_delivery_fee: number;
  regular_delivery_fee: number;
  free_delivery_threshold: number;
  bank_transfer_enabled: boolean;
  bank_name: string;
  bank_account_number: string;
  bank_account_holder: string;
  bank_accounts?: BankAccount[];
  qris_enabled: boolean;
  qris_image_url?: string;
  cod_enabled: boolean;
  min_order_amount: number;
  created_at?: string;
  updated_at?: string;
}
