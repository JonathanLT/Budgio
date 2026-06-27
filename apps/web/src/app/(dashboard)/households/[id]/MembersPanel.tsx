'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import type { UserSuggestion } from '@budgio/types';
import type { Member } from './page';

interface Props {
  householdId: string;
  members: Member[];
  token: string;
  onMembersChange: (members: Member[]) => void;
}

export function MembersPanel({ householdId, members, token, onMembersChange }: Props) {
  const [suggestions, setSuggestions] = useState<UserSuggestion[]>([]);
  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserSuggestion | null>(null);
  const [open, setOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getMemberSuggestions(token, householdId)
      .then((data) => setSuggestions(data as UserSuggestion[]))
      .catch(() => {});
  }, [token, householdId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = suggestions.filter(
    (u) =>
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase()),
  );

  function selectUser(u: UserSuggestion) {
    setSelectedUser(u);
    setQuery(u.name);
    setOpen(false);
    setError('');
  }

  function clearSelection() {
    setSelectedUser(null);
    setQuery('');
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    setInviting(true);
    setError('');
    try {
      const newMember = (await api.inviteMember(token, householdId, selectedUser.email)) as Member;
      onMembersChange([...members, newMember]);
      setSuggestions((prev) => prev.filter((u) => u.id !== selectedUser.id));
      clearSelection();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(memberId: string) {
    const removed = members.find((m) => m.user.id === memberId);
    await api.removeMember(token, householdId, memberId);
    onMembersChange(members.filter((m) => m.user.id !== memberId));
    if (removed) {
      setSuggestions((prev) =>
        [...prev, { id: removed.user.id, name: removed.user.name, email: removed.user.email, avatarUrl: removed.user.avatarUrl }]
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Invite form */}
      <div className="bg-theme-surface rounded-xl border border-theme-border p-6 space-y-4">
        <h2 className="font-semibold text-theme-text">Inviter un membre</h2>

        {suggestions.length === 0 && !selectedUser ? (
          <p className="text-sm text-theme-muted">Tous les utilisateurs Budgio sont déjà membres de ce foyer.</p>
        ) : (
          <form onSubmit={handleInvite} className="flex gap-3">
            <div className="relative flex-1" ref={dropdownRef}>
              <div className="flex items-center border border-theme-border bg-theme-surface rounded-lg px-3 py-2 gap-2 focus-within:ring-2 focus-within:ring-brand-500">
                {selectedUser?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedUser.avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover shrink-0" />
                ) : selectedUser ? (
                  <div className="w-5 h-5 rounded-full bg-theme-bg flex items-center justify-center text-xs font-bold text-theme-muted shrink-0">
                    {selectedUser.name[0]}
                  </div>
                ) : null}
                <input
                  type="text"
                  placeholder="Rechercher un utilisateur…"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setSelectedUser(null); setOpen(true); }}
                  onFocus={() => setOpen(true)}
                  className="flex-1 bg-transparent text-sm text-theme-text placeholder:text-theme-muted focus:outline-none"
                />
                {(query || selectedUser) && (
                  <button type="button" onClick={clearSelection} className="text-theme-muted hover:text-theme-text text-lg leading-none">×</button>
                )}
              </div>

              {open && filtered.length > 0 && (
                <div className="absolute z-20 top-full mt-1 w-full bg-theme-surface border border-theme-border rounded-xl shadow-lg overflow-hidden">
                  {filtered.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => selectUser(u)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-theme-bg transition-colors text-left"
                    >
                      {u.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-theme-bg flex items-center justify-center font-bold text-theme-muted shrink-0">
                          {u.name[0]}
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-theme-text">{u.name}</p>
                        <p className="text-xs text-theme-muted">{u.email}</p>
                      </div>
                    </button>
                  ))}
                  {filtered.length === 0 && query && (
                    <p className="px-4 py-3 text-sm text-theme-muted">Aucun résultat</p>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={inviting || !selectedUser}
              className="bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors shrink-0"
            >
              {inviting ? '…' : 'Inviter'}
            </button>
          </form>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}
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
