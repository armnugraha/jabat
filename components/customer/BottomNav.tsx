'use client';
 
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Pill, FileText, MessageSquare, User } from 'lucide-react';
import { useCart } from '@/lib/store/cart-context';
import { useAuth } from '@/lib/store/auth-context';

export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { user } = useAuth();
  const [activeOrdersCount, setActiveOrdersCount] = useState<number>(0);

  // Fetch active orders count from API only for authenticated user
  useEffect(() => {
    if (!user?.id) {
      setActiveOrdersCount(0);
      return;
    }

    fetch(`/api/orders?userId=${user.id}&role=${user.role}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          const count = json.data.filter((o: any) =>
            ['pending', 'waiting_prescription', 'prescription_review', 'confirmed', 'preparing', 'out_for_delivery'].includes(o.status)
          ).length;
          setActiveOrdersCount(count);
        }
      })
      .catch((err) => console.warn('Order count fetch notice:', err));
  }, [user, pathname]);

  // Unread consultation notification only for authenticated user
  const hasUnreadChat = Boolean(user);

  const navItems = [
    {
      label: 'Beranda',
      href: '/',
      icon: Home,
      isActive: pathname === '/',
    },
    {
      label: 'Produk',
      href: '/products',
      icon: Pill,
      isActive: pathname.startsWith('/products'),
    },
    {
      label: 'Pesanan',
      href: '/orders',
      icon: FileText,
      isActive: pathname.startsWith('/orders'),
      badge: activeOrdersCount > 0 ? activeOrdersCount : undefined,
    },
    {
      label: 'Chat',
      href: '/chat',
      icon: MessageSquare,
      isActive: pathname.startsWith('/chat'),
      dot: hasUnreadChat,
    },
    {
      label: 'Akun',
      href: '/account',
      icon: User,
      isActive: pathname.startsWith('/account'),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/80 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] md:hidden">
      <div className="max-w-md mx-auto grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center relative transition-colors ${
                item.isActive
                  ? 'text-sky-600 font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${item.isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                {typeof item.badge === 'number' && item.badge > 0 ? (
                  <span className="absolute -top-1.5 -right-2 bg-orange-500 text-white text-[9px] font-bold px-1 min-w-[14px] h-[14px] rounded-full flex items-center justify-center shadow-xs">
                    {item.badge}
                  </span>
                ) : null}
                {item.dot && (
                  <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full bg-sky-500 ring-2 ring-white" />
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{item.label}</span>
              {item.isActive && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-sky-600" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
