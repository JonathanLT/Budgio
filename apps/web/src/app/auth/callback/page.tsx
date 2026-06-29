'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

function CallbackContent() {
  const router = useRouter();

  useEffect(() => {
    // Access token arrives in the URL fragment (#access=...) — never sent to the server
    // Refresh token is set as an HttpOnly cookie by the API redirect
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access');

    if (accessToken) {
      localStorage.setItem('budgio_access', accessToken);
      // Clear the fragment from history so the token doesn't linger in the URL bar
      window.history.replaceState(null, '', window.location.pathname);
      router.replace('/households');
    } else {
      router.replace('/login?error=OAuthFailed');
    }
  }, [router]);

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
  return <CallbackContent />;
}
