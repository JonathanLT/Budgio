'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';

interface HouseholdPreview {
  id: string;
  name: string;
  myRole: 'ADMIN' | 'MEMBER';
  members: { id: string; user: { name: string; avatarUrl: string | null } }[];
  createdAt: string;
}

export default function HouseholdsPage() {
  const { token, loading } = useAuth();
  const [households, setHouseholds] = useState<HouseholdPreview[]>([]);
  const [fetching, setFetching] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!token) return;
    api
      .myHouseholds(token)
      .then((data) => setHouseholds(data as HouseholdPreview[]))
      .finally(() => setFetching(false));
  }, [token]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !newName.trim()) return;
    setCreating(true);
    try {
      const h = (await api.createHousehold(token, newName.trim())) as HouseholdPreview & {
        myRole?: 'ADMIN';
      };
      setHouseholds((prev) => [...prev, { ...h, myRole: 'ADMIN' }]);
      setNewName('');
    } finally {
      setCreating(false);
    }
  }

  if (loading || fetching) {
    return <div className="text-center py-20 text-theme-muted">Chargement…</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-theme-text">Mes foyers</h1>
      </div>

      {/* Create form */}
      <form onSubmit={handleCreate} className="flex gap-3">
        <input
          type="text"
          placeholder="Nom du nouveau foyer"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="flex-1 border border-theme-border bg-theme-surface text-theme-text rounded-lg px-4 py-2 text-sm placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          className="bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {creating ? '…' : 'Créer'}
        </button>
      </form>

      {/* List */}
      {households.length === 0 ? (
        <div className="text-center py-16 text-theme-muted">
          <p className="text-4xl mb-4">🏠</p>
          <p>Vous n&apos;avez pas encore de foyer. Créez-en un ci-dessus.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {households.map((h) => (
            <div key={h.id} className="relative group/card">
              <Link
                href={`/households/${h.id}`}
                className="block bg-theme-surface rounded-xl border border-theme-border p-6 hover:shadow-md transition-shadow space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-lg text-theme-text">{h.name}</h2>
                  {h.myRole === 'ADMIN' && (
                    <span className="text-xs bg-brand-50 text-brand-700 px-2 py-1 rounded-full font-medium">
                      Admin
                    </span>
                  )}
                </div>
                <p className="text-sm text-theme-muted">
                  {h.members.length} membre{h.members.length > 1 ? 's' : ''}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {h.members.slice(0, 5).map((m) =>
                      m.user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={m.id}
                          src={m.user.avatarUrl}
                          alt={m.user.name}
                          className="w-8 h-8 rounded-full border-2 border-theme-surface object-cover"
                        />
                      ) : (
                        <div
                          key={m.id}
                          className="w-8 h-8 rounded-full border-2 border-theme-surface bg-theme-bg flex items-center justify-center text-xs font-bold text-theme-muted"
                        >
                          {m.user.name[0]}
                        </div>
                      ),
                    )}
                  </div>
                  {/* spacer pour aligner la roue dentée — celle-ci est en absolute */}
                  <div className="w-7 h-7" />
                </div>
              </Link>
              {/* Roue dentée hors du Link pour éviter <a> dans <a> */}
              <Link
                href={`/households/${h.id}/settings`}
                className="absolute bottom-6 right-6 p-1.5 rounded-lg text-theme-muted opacity-0 group-hover/card:opacity-100 hover:bg-theme-bg hover:text-theme-text transition-all"
                title="Paramètres du foyer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
