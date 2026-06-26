'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, THEMES, type Theme } from '@/hooks/useTheme';
import { api } from '@/lib/api';
import type { User } from '@budgio/types';

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

export default function ProfilePage() {
  const { token, loading, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [user, setUser] = useState<User | null>(null);
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    api
      .me(token)
      .then((data) => {
        const u = data as User;
        setUser(u);
        if (u.theme && u.theme in THEMES) {
          setTheme(u.theme as Theme);
        }
      })
      .finally(() => setFetching(false));
  }, [token, setTheme]);

  async function handleThemeChange(next: Theme) {
    setTheme(next);
    if (!token) return;
    setSaving(true);
    try {
      await api.updateProfile(token, { theme: next });
    } finally {
      setSaving(false);
    }
  }

  if (loading || fetching) {
    return <div className="text-center py-20 text-theme-muted">Chargement…</div>;
  }

  if (!user) {
    return <div className="text-center py-20 text-red-400">Impossible de charger le profil.</div>;
  }

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-bold text-theme-text">Mon profil</h1>

      <div className="bg-theme-surface rounded-xl border border-theme-border p-6 space-y-6">
        {/* Avatar + nom */}
        <div className="flex items-center gap-4">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-16 h-16 rounded-full object-cover border border-theme-border"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-2xl font-bold text-green-700">
              {user.name[0]}
            </div>
          )}
          <div>
            <p className="font-semibold text-lg text-theme-text">{user.name}</p>
            <p className="text-sm text-theme-muted">
              Membre depuis le {formatDate(user.createdAt)}
            </p>
          </div>
        </div>

        {/* Champs */}
        <div className="space-y-4 border-t border-theme-border pt-4">
          <Field label="Nom" value={user.name} />
          <Field label="Adresse e-mail" value={user.email} />
          <Field label="Identifiant" value={user.id} mono />
        </div>

        {/* Sélecteur de thème */}
        <div className="border-t border-theme-border pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-theme-muted uppercase tracking-wide">
              Thème
            </p>
            {saving && (
              <span className="text-xs text-theme-muted">Sauvegarde…</span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(THEMES) as [Theme, typeof THEMES[Theme]][]).map(([key, opt]) => {
              const active = theme === key;
              return (
                <button
                  key={key}
                  onClick={() => handleThemeChange(key)}
                  title={opt.label}
                  className={`relative rounded-xl overflow-hidden border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 ${
                    active
                      ? 'border-green-500 shadow-md'
                      : 'border-theme-border hover:border-theme-muted'
                  }`}
                >
                  {/* Miniature */}
                  <div style={{ backgroundColor: opt.preview.bg }} className="p-2 pb-1.5 h-14">
                    <div
                      style={{ backgroundColor: opt.preview.surface, borderColor: opt.preview.text + '22' }}
                      className="rounded-md p-1.5 mb-1 border space-y-1"
                    >
                      <div style={{ backgroundColor: opt.preview.text, width: '65%', height: 3, borderRadius: 2, opacity: 0.85 }} />
                      <div style={{ backgroundColor: opt.preview.text, width: '45%', height: 3, borderRadius: 2, opacity: 0.4 }} />
                    </div>
                    <div style={{ backgroundColor: opt.preview.accent, width: '40%', height: 3, borderRadius: 2 }} />
                  </div>
                  {/* Label */}
                  <div
                    style={{ backgroundColor: opt.preview.surface }}
                    className="px-1 py-1 text-center"
                  >
                    <span style={{ color: opt.preview.text, fontSize: 9, fontWeight: 600 }} className="block truncate leading-tight">
                      {opt.label}
                    </span>
                  </div>
                  {/* Indicateur actif */}
                  {active && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-xs text-theme-muted opacity-70 border-t border-theme-border pt-4">
          Le profil est géré via Google. Les modifications de nom ou d&apos;avatar se font depuis votre compte Google.
        </p>

        {/* Déconnexion */}
        <div className="border-t border-theme-border pt-4">
          <button
            onClick={logout}
            className="text-sm text-red-500 hover:text-red-700 transition-colors font-medium"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs font-medium text-theme-muted uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className={`text-sm ${mono ? 'font-mono text-theme-muted' : 'text-theme-text'}`}>
        {value}
      </p>
    </div>
  );
}
