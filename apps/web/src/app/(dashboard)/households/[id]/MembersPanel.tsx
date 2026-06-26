'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import type { Member } from './page';

interface Props {
  householdId: string;
  members: Member[];
  token: string;
  onMembersChange: (members: Member[]) => void;
}

export function MembersPanel({ householdId, members, token, onMembersChange }: Props) {
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    setError('');
    try {
      const newMember = (await api.inviteMember(token, householdId, email.trim())) as Member;
      onMembersChange([...members, newMember]);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(memberId: string) {
    await api.removeMember(token, householdId, memberId);
    onMembersChange(members.filter((m) => m.user.id !== memberId));
  }

  return (
    <div className="space-y-6">
      {/* Invite form */}
      <div className="bg-theme-surface rounded-xl border border-theme-border p-6 space-y-4">
        <h2 className="font-semibold text-theme-text">Inviter un membre</h2>
        <form onSubmit={handleInvite} className="flex gap-3">
          <input
            type="email"
            placeholder="adresse@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 border border-theme-border bg-theme-surface text-theme-text rounded-lg px-4 py-2 text-sm placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="submit"
            disabled={inviting || !email.trim()}
            className="bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {inviting ? '…' : 'Inviter'}
          </button>
        </form>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <p className="text-xs text-theme-muted opacity-70">
          L&apos;utilisateur doit déjà avoir un compte Budgio.
        </p>
      </div>

      {/* Members list */}
      <div className="bg-theme-surface rounded-xl border border-theme-border divide-y divide-theme-border">
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              {m.user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.user.avatarUrl}
                  alt={m.user.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-theme-bg flex items-center justify-center font-bold text-theme-muted">
                  {m.user.name[0]}
                </div>
              )}
              <div>
                <p className="font-medium text-sm text-theme-text">{m.user.name}</p>
                <p className="text-xs text-theme-muted">{m.user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-xs px-2 py-1 rounded-full font-medium ${
                  m.role === 'ADMIN'
                    ? 'bg-brand-50 text-brand-700'
                    : 'bg-theme-bg text-theme-muted'
                }`}
              >
                {m.role === 'ADMIN' ? 'Admin' : 'Membre'}
              </span>
              {m.role !== 'ADMIN' && (
                <button
                  onClick={() => handleRemove(m.user.id)}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  Retirer
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
