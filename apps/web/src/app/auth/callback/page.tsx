'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function CallbackContent() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');

    if (accessToken && refreshToken) {
      localStorage.setItem('budgio_access', accessToken);
      localStorage.setItem('budgio_refresh', refreshToken);
      router.replace('/households');
    } else {
      router.replace('/login?error=OAuthFailed');
    }
  }, [params, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-theme-bg">
      <div className="text-center space-y-4">
        <div className="text-4xl animate-spin">⏳</div>
        <p className="text-theme-muted">Connexion en cours…</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-theme-bg">
        <p className="text-theme-muted">Chargement…</p>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
