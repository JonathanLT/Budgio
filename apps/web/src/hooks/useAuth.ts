'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

export function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const syncToken = useCallback(() => {
    const t = localStorage.getItem('budgio_access');
    setToken(t);
    return t;
  }, []);

  useEffect(() => {
    const t = syncToken();
    if (!t) {
      router.replace('/login');
    }
    setLoading(false);

    // Resync le token après chaque rafraîchissement automatique effectué par apiFetch
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'budgio_access') setToken(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [router, syncToken]);

  function logout() {
    localStorage.removeItem('budgio_access');
    // HttpOnly cookie cleared by the API — fire-and-forget
    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { Authorization: `Bearer ${token ?? ''}` },
    }).catch(() => {});
    router.replace('/login');
  }

  return { token, loading, logout };
}
