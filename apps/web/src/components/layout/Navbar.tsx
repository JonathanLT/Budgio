'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { User } from '@budgio/types';

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('budgio_access');
    if (!token) return;
    api.me(token).then((data) => setUser(data as User)).catch(() => {});
  }, []);

  return (
    <header className="bg-theme-surface border-b border-theme-border shadow-sm">
      <div className="container mx-auto px-4 max-w-5xl flex items-center justify-between h-16">
        <Link href="/households" className="flex items-center gap-2 font-bold text-xl text-brand-600">
          <span>💰</span>
          <span>Budgio</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/households" className="text-theme-muted hover:text-theme-text transition-colors">
            Mes foyers
          </Link>
          <Link href="/profile" className="flex items-center gap-2 text-theme-muted hover:text-theme-text transition-colors">
            {user?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt={user.name} className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-brand-50 flex items-center justify-center text-xs font-bold text-brand-600">
                {user?.name?.[0] ?? '…'}
              </div>
            )}
            Profil
          </Link>
        </nav>
      </div>
    </header>
  );
}
