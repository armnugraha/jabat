# 🏥 Apotek Sehat Mandiri (Tebet Barat, Jakarta Selatan)
> **Farmasi Digital Resmi & Terpercaya — Production-Ready MVP Web Application**

A modern full-stack web application built specifically for a single independent pharmacy in Indonesia (**Apotek Sehat Mandiri**), featuring strict compliance with the provided **Google Stitch UI/UX Design System**, Supabase backend, PostgreSQL relational database, Row Level Security (RLS), multi-packaging variant logic (Tablet, Strip, Box, Botol), BPOM prescription verification, and live pharmacist consultation desk.

---

## 📸 Stitch Design System Implementation

The application strictly implements all 5 Google Stitch design screens:
1. **Customer Home Screen (`/`)**:
   - Live pharmacy status pill (`• Buka • Tutup 21.00`) and location badge (`📍 Tebet Barat, Jaksel`).
   - Integrated search bar (`Cari obat, resep, vitamin, sirup demam, alkes...`).
   - Hero banner with family health value proposition & CTA.
   - 6-Category soft pastel grid (Obat Bebas, Perawatan Diri, Vitamin & Suplemen, Ibu & Anak, Alat Kesehatan, Promo).
   - Instant Courier banner (`Spesial Pekan Ini: Gratis Ongkir Instan Tebet`).
   - `Apoteker Siaga` consultation callout to **apt. Siti Rahma, S.Farm.**.
   - 2-Column Product Grid with medicine status pills (`Obat Bebas`, `Wajib Resep`, `Promo`).
   - Store info footer card with SIPA and pharmacy address.
   - 5-item mobile bottom navigation with active indicators.

2. **Product Detail Screen (`/products/[id]`)**:
   - Product gallery with pagination indicators (`1/3 Foto`), official BPOM verification pill, and discount tags.
   - Real-time packaging/variant selector (Tablet, Strip, Box) with instant price and stock computation.
   - Standards & BPOM Regulation section (No. Reg BPOM, SIPA Apoteker PJ, and proper drug storage temperature).
   - Tabbed medicine specifications (*Indikasi & Manfaat*, *Komposisi*, *Dosis & Aturan*, *Perhatian*).
   - "Sering Dibeli Bersamaan" cross-selling bundle cards.
   - Sticky bottom bar with quantity modifier, Apoteker direct chat, and 1-click Add to Cart / Buy Now.

3. **Product Catalog & Search Screen (`/products`)**:
   - Category pill filters with horizontal smooth scrolling.
   - Inventory counter badge (`48 Produk Siap Kirim`) and popularity sort.
   - 2-Column product cards with favorite heart toggle, packaging watermark (`STRIP @ 10 TABLET`), and quick add (+).
   - Floating cart indicator banner (`3 item di keranjang Rp 58.500 [Lihat ➔]`).

4. **Cart & Checkout Screen (`/cart`)**:
   - Select all / individual item checkboxes with price, discount, and unit breakdowns.
   - Doctor's Prescription upload section with image preview, notes, and file validation for *Wajib Resep* items.
   - Primary delivery address selector with courier note instructions.
   - Shipping options:
     - ⦿ **Kurir Express Apotek Tebet [Rekomendasi] (Rp 10.000)** (30-45 min delivery with thermal safety pouch).
     - ○ **Reguler Sameday (Rp 15.000)**.
     - ○ **Ambil Sendiri di Apotek (Gratis)**.
   - Pharmacy Voucher modal with promo code application (e.g., `HEMATSEHAT` for Rp 10.000 discount).
   - Payment method selector: QRIS / GoPay / OVO, Bank Transfer BCA, COD.
   - Transparent price calculation snapshotting with safety seals.

5. **Pharmacist Consultation Desk (`/chat`)**:
   - SIPA-verified pharmacist header (`apt. Siti Rahma, S.Farm. • SIPA: 19870412/SIPA-31.74/2021/2048`).
   - Quick symptom suggestion chips (*Aturan minum Paracetamol*, *Dosis anak demam*).
   - Interactive pharmacist chat stream with timestamps and read receipts.
   - **Structured In-Chat Medicine Recommendation Cards** with direct `+ Tambah` action to cart.

---

## 🛠️ Technology Stack

- **Frontend & Routing**: [Next.js 14](https://nextjs.org/) (App Router), [React 18](https://react.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Styling & Design System**: [Tailwind CSS](https://tailwindcss.com/), [Lucide React Icons](https://lucide.dev/)
- **Backend & Database**: [Supabase PostgreSQL](https://supabase.com/)
- **Authentication**: Supabase Auth (Customer, Pharmacist, Admin roles with RLS)
- **File & Prescription Storage**: Supabase Private Storage Buckets
- **Realtime**: Supabase Realtime Channels for patient-pharmacist chat
- **Deployment**: [Vercel](https://vercel.com/) (Zero-serverless configuration, production-optimized)

---

## 🗄️ Database Architecture & Relational Schema

The complete schema is available at [`supabase/schema.sql`](file:///d:/2026/jabat/supabase/schema.sql).

### Core Tables:
1. `profiles`: Extends `auth.users` with `role` (`customer`, `pharmacist`, `admin`), `phone`, and `sipa_number`.
2. `categories`: Sediaan obat and product categories.
3. `products`: Medical products with BPOM registration number, manufacturer, indications, composition, dosage, precautions, and prescription requirements.
4. `product_variants`: Multi-packaging units (Tablet, Strip, Box, Botol) with individual prices, strike discounts, and stock levels.
5. `orders`: Order header with delivery options, addresses, payment methods, and prescription status.
6. `order_items`: **Immutable historical snapshot table** storing product name, variant unit, and price at purchase time.
7. `prescriptions`: Private prescription uploads with review notes and approval statuses (`pending`, `approved`, `needs_revision`, `rejected`).
8. `conversations` & `messages`: Consultation messages between patients and pharmacists with recommended medicine attachments.
9. `customer_addresses`: Customer saved delivery addresses.
10. `promotions`: Pharmacy vouchers and discounts.
11. `store_settings`: Operating hours, SIPA, courier fees, and banking info.

---

## 🚀 Getting Started Locally

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/apotek-sehat-mandiri.git
cd apotek-sehat-mandiri
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-supabase-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Run Database Migrations & Seeds
Execute the SQL scripts in your Supabase SQL Editor:
1. Run [`supabase/schema.sql`](file:///d:/2026/jabat/supabase/schema.sql) to create tables, indexes, triggers, and RLS policies.
2. Run [`supabase/seed.sql`](file:///d:/2026/jabat/supabase/seed.sql) to populate initial authentic pharmacy data.

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔒 Security & Row Level Security (RLS)

- **Prescription Privacy**: Medical prescription images are stored in a private Supabase Storage bucket and can only be accessed by the uploading customer and licensed pharmacy staff (`pharmacist` / `admin`).
- **Immutable Order Items**: Product names, packaging units, and prices are snapshotted into `order_items` during checkout so future price edits never alter historical records.
- **Price Integrity**: All checkout totals are recalculated securely and discounts validated against database rules.
- **Role Isolation**: Customers cannot view other customers' orders, addresses, or prescription records.

---

## 🚢 Deployment to Vercel

1. Push this repository to GitHub.
2. Go to [Vercel Dashboard](https://vercel.com/) and click **New Project**.
3. Import your repository.
4. Set the Environment Variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
5. Click **Deploy**.

---

## 📄 License & Compliance

Built for **Apotek Sehat Mandiri** pursuant to Indonesian Ministry of Health (Kemenkes) & BPOM pharmaceutical electronic commerce regulations.
