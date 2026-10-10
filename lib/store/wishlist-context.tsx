'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '../types';
import { useAuth } from './auth-context';

interface WishlistContextType {
  wishlistIds: string[];
  wishlistItems: Product[];
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (product: Product) => boolean; // returns true if added, false if removed / unauthenticated
  removeFromWishlist: (productId: string) => void;
  wishlistCount: number;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [wishlistItems, setWishlistItems] = useState<Product[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!user) {
      setWishlistItems([]);
      setIsLoaded(true);
      return;
    }

    fetch(`/api/wishlist?userId=${user.id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setWishlistItems(json.data);
        }
      })
      .catch((err) => console.warn('Wishlist sync notice:', err))
      .finally(() => setIsLoaded(true));
  }, [user?.id]);

  useEffect(() => {
    if (!isLoaded || !user) return;
    fetch('/api/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, items: wishlistItems }),
    }).catch((err) => console.warn('Wishlist post notice:', err));
  }, [wishlistItems, isLoaded, user?.id]);

  const isInWishlist = (productId: string) => {
    if (!user) return false;
    return wishlistItems.some((item) => item.id === productId || item.slug === productId);
  };

  const toggleWishlist = (product: Product): boolean => {
    if (!user) {
      return false;
    }

    const exists = isInWishlist(product.id) || (product.slug && isInWishlist(product.slug));
    if (exists) {
      setWishlistItems((prev) =>
        prev.filter((item) => item.id !== product.id && item.slug !== product.id)
      );
      return false;
    } else {
      setWishlistItems((prev) => [product, ...prev]);
      return true;
    }
  };

  const removeFromWishlist = (productId: string) => {
    if (!user) return;
    setWishlistItems((prev) =>
      prev.filter((item) => item.id !== productId && item.slug !== productId)
    );
  };

  const wishlistIds = wishlistItems.map((item) => item.id);
  const wishlistCount = wishlistItems.length;

  return (
    <WishlistContext.Provider
      value={{
        wishlistIds,
        wishlistItems,
        isInWishlist,
        toggleWishlist,
        removeFromWishlist,
        wishlistCount,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};

