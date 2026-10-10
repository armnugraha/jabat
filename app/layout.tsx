import type { Metadata } from 'next';
import './globals.css';
import { CartProvider } from '@/lib/store/cart-context';
import { AuthProvider } from '@/lib/store/auth-context';
import { WishlistProvider } from '@/lib/store/wishlist-context';

export const metadata: Metadata = {
  title: 'Apotek Sehat Mandiri - Farmasi Digital Resmi & Terpercaya',
  description:
    'Apotek independen resmi BPOM & Kemenkes di Tebet Barat, Jakarta Selatan. Melayani pesan obat resep & non-resep, konsultasi apoteker gratis, serta pengiriman instan langsung ke rumah.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 selection:bg-sky-500 selection:text-white antialiased">
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              {children}
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
