'use client';

import React, { useState } from 'react';

interface UserAvatarProps {
  name?: string;
  avatarUrl?: string | null;
  role?: 'customer' | 'pharmacist' | 'admin' | string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function getInitials(name?: string): string {
  if (!name || !name.trim()) return 'U';
  
  // Clean honorifics or common Indonesian titles for clean initials
  const cleaned = name
    .replace(/\b(apt\.|dr\.|drg\.|prof\.|h\.|hj\.|s\.farm\.|s\.ked\.|m\.farm\.)\b/gi, '')
    .replace(/[^\w\s]/g, '')
    .trim();

  const parts = (cleaned || name).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) {
    const word = parts[0];
    return word.length > 1 ? word.slice(0, 2).toUpperCase() : word.toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  avatarUrl,
  role = 'customer',
  size = 'md',
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);

  const sizeClasses = {
    sm: 'w-8 h-8 rounded-xl text-xs',
    md: 'w-10 h-10 rounded-xl text-sm',
    lg: 'w-14 h-14 rounded-2xl text-base font-extrabold',
    xl: 'w-16 h-16 rounded-2xl text-lg font-extrabold',
  };

  const roleGradients = {
    pharmacist: 'from-emerald-600 to-teal-500 text-white shadow-emerald-500/20 border-emerald-300/40',
    admin: 'from-slate-900 via-slate-800 to-sky-950 text-sky-300 shadow-slate-900/30 border-slate-700/60',
    customer: 'from-sky-600 to-sky-400 text-white shadow-sky-500/20 border-sky-300/40',
  };

  const gradient = roleGradients[role as keyof typeof roleGradients] || roleGradients.customer;
  const initials = getInitials(name);

  // Check if avatarUrl is a valid non-empty string and hasn't errored out
  const isValidPhoto = avatarUrl && avatarUrl.trim() !== '' && !hasError;

  if (isValidPhoto) {
    return (
      <img
        src={avatarUrl}
        alt={name || 'Avatar'}
        onError={() => setHasError(true)}
        className={`${sizeClasses[size]} object-cover border border-slate-200 shadow-xs shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} bg-gradient-to-tr ${gradient} flex items-center justify-center border shadow-md shrink-0 tracking-wider select-none font-bold ${className}`}
    >
      {initials}
    </div>
  );
};
