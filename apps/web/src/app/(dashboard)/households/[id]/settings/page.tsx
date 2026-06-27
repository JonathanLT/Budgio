'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import type { Category, HouseholdMember } from '@budgio/types';

interface HouseholdDetail {
  id: string;
  name: string;
  isActive: boolean;
  members: HouseholdMember[];
}

function currentUserIdFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return (payload.sub ?? payload.id) as string | null;
  } catch {
    return null;
  }
}

export default function HouseholdSettingsPage() {
  const { token, loading } = useAuth();
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [household, setHousehold] = useState<HouseholdDetail | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [fetching, setFetching] = useState(true);
  const currentUserId = token ? currentUserIdFromToken(token) : null;

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.getHousehold(token, params.id),
      api.getCategories(token, params.id),
    ]).then(([h, cats]) => {
      setHousehold(h as HouseholdDetail);
      setCategories(cats as Category[]);
    }).finally(() => setFetching(false));
  }, [token, params.id]);

  if (loading || fetching) return <div className="text-center py-20 text-theme-muted">Chargement…</div>;
  if (!household) return <div className="text-center py-20 text-red-400">Foyer introuvable.</div>;

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-theme-muted">
        <Link href="/households" className="hover:text-theme-text">Mes foyers</Link>
        <span>/</span>
        <Link href={`/households/${params.id}`} className="hover:text-theme-text">{household.name}</Link>
        <span>/</span>
        <span className="text-theme-text font-medium">Paramètres</span>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-theme-text">Paramètres du foyer</h1>
        {household.members.find((m) => m.user.id === currentUserId)?.role === 'ADMIN' && (
          <Link
            href={`/households/${params.id}/history`}
            className="text-sm px-4 py-2 border border-theme-border text-theme-muted hover:text-theme-text hover:bg-theme-bg rounded-lg transition-colors"
          >
            Historique
          </Link>
        )}
      </div>

      <RenameSection household={household} token={token!} onRenamed={(name) => setHousehold((h) => h ? { ...h, name } : h)} />
      <CategoriesSection householdId={params.id} token={token!} categories={categories} setCategories={setCategories} />
      <MembersSection householdId={params.id} token={token!} currentUserId={currentUserId} members={household.members} setMembers={(members) => setHousehold((h) => h ? { ...h, members } : h)} />
      <DangerSection householdId={params.id} token={token!} onDeactivated={() => router.replace('/households')} />
    </div>
  );
}

/* ─── Rename ─────────────────────────────────────────────────────────────── */

function RenameSection({ household, token, onRenamed }: { household: HouseholdDetail; token: string; onRenamed: (name: string) => void }) {
  const [name, setName] = useState(household.name);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name === household.name) return;
    setSaving(true);
    try {
      await api.updateHousehold(token, household.id, name.trim());
      onRenamed(name.trim());
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="bg-theme-surface border border-theme-border rounded-xl p-6 space-y-4">
      <h2 className="font-semibold text-theme-text">Nom du foyer</h2>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 border border-theme-border bg-theme-surface text-theme-text rounded-lg px-3 py-2 text-sm placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-brand-500"
          required
        />
        <button
          type="submit"
          disabled={saving || name === household.name || !name.trim()}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {saving ? '…' : 'Enregistrer'}
        </button>
      </form>
    </section>
  );
}

/* ─── Categories ─────────────────────────────────────────────────────────── */

function CategoriesSection({ householdId, token, categories, setCategories }: {
  householdId: string; token: string;
  categories: Category[]; setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
}) {
  const [label, setLabel] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editColor, setEditColor] = useState('');
  const dragId = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    setCreating(true);
    try {
      const cat = await api.createCategory(token, householdId, { label: label.trim(), color });
      setCategories((prev) => [...prev, cat as Category]);
      setLabel('');
      setColor('#6366f1');
    } finally {
      setCreating(false);
    }
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setEditLabel(cat.label);
    setEditColor(cat.color);
  }

  async function handleUpdate(catId: string) {
    const updated = await api.updateCategory(token, householdId, catId, { label: editLabel, color: editColor });
    setCategories((prev) => prev.map((c) => c.id === catId ? (updated as Category) : c));
    setEditingId(null);
  }

  async function handleDelete(catId: string) {
    await api.deleteCategory(token, householdId, catId);
    setCategories((prev) => prev.filter((c) => c.id !== catId));
  }

  function handleDragStart(id: string) {
    dragId.current = id;
  }

  function handleDragOver(e: React.DragEvent, id: string) {
    e.preventDefault();
    if (dragId.current !== id) setDragOverId(id);
  }

  function handleDrop(targetId: string) {
    const fromId = dragId.current;
    dragId.current = null;
    setDragOverId(null);
    if (!fromId || fromId === targetId) return;

    setCategories((prev) => {
      const next = [...prev];
      const fromIdx = next.findIndex((c) => c.id === fromId);
      const toIdx = next.findIndex((c) => c.id === targetId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      const items = next.map((c, i) => ({ id: c.id, order: i }));
      void api.reorderCategories(token, householdId, items);
      return next;
    });
  }

  function handleDragEnd() {
    dragId.current = null;
    setDragOverId(null);
  }

  return (
    <section className="bg-theme-surface border border-theme-border rounded-xl p-6 space-y-4">
      <h2 className="font-semibold text-theme-text">Catégories</h2>

      {/* Create form */}
      <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-2">
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-9 h-9 flex-shrink-0 rounded-lg border border-theme-border cursor-pointer p-0.5 bg-theme-surface"
            title="Couleur"
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Nom de la catégorie"
            className="flex-1 border border-theme-border bg-theme-surface text-theme-text rounded-lg px-3 py-2 text-sm placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-brand-500"
            required
          />
        </div>
        <button
          type="submit"
          disabled={creating || !label.trim()}
          className="sm:flex-shrink-0 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {creating ? '…' : 'Ajouter'}
        </button>
      </form>

      {/* List */}
      {categories.length === 0 ? (
        <p className="text-sm text-theme-muted text-center py-4">Aucune catégorie. Créez-en une ci-dessus.</p>
      ) : (
        <div className="divide-y divide-theme-border">
          {categories.map((cat) => (
            <div
              key={cat.id}
              draggable={editingId !== cat.id}
              onDragStart={() => handleDragStart(cat.id)}
              onDragOver={(e) => handleDragOver(e, cat.id)}
              onDrop={() => handleDrop(cat.id)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 py-2.5 transition-colors ${dragOverId === cat.id ? 'bg-theme-bg rounded-lg' : ''}`}
            >
              {editingId === cat.id ? (
                <>
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="w-8 h-8 rounded-lg border border-theme-border cursor-pointer p-0.5 bg-theme-surface"
                  />
                  <input
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="flex-1 border border-theme-border bg-theme-surface text-theme-text rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button onClick={() => handleUpdate(cat.id)} className="text-xs text-brand-600 font-medium hover:text-brand-700">Sauver</button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-theme-muted hover:text-theme-text">Annuler</button>
                </>
              ) : (
                <>
                  <span className="text-theme-muted cursor-grab active:cursor-grabbing select-none" title="Réordonner">⠿</span>
                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="flex-1 text-sm text-theme-text">{cat.label}</span>
                  <button onClick={() => startEdit(cat)} className="text-xs text-theme-muted hover:text-brand-600 transition-colors">✏️</button>
                  <button onClick={() => handleDelete(cat.id)} className="text-xs text-theme-muted hover:text-red-500 transition-colors">✕</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ─── Members ────────────────────────────────────────────────────────────── */

function MembersSection({ householdId, token, currentUserId, members, setMembers }: {
  householdId: string; token: string; currentUserId: string | null;
  members: HouseholdMember[]; setMembers: (members: HouseholdMember[]) => void;
}) {
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setInviting(true);
    setError('');
    try {
      const m = await api.inviteMember(token, householdId, email.trim());
      setMembers([...members, m as HouseholdMember]);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setInviting(false);
    }
  }

  async function handleRoleChange(memberId: string, role: string) {
    const updated = await api.updateMemberRole(token, householdId, memberId, role);
    setMembers(members.map((m) => m.user.id === memberId ? { ...m, ...(updated as HouseholdMember) } : m));
  }

  async function handleRemove(memberId: string) {
    await api.removeMember(token, householdId, memberId);
    setMembers(members.filter((m) => m.user.id !== memberId));
  }

  return (
    <section className="bg-theme-surface border border-theme-border rounded-xl p-6 space-y-4">
      <h2 className="font-semibold text-theme-text">Membres</h2>

      {/* Invite */}
      <form onSubmit={handleInvite} className="flex gap-3">
        <input
          type="email"
          placeholder="adresse@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 border border-theme-border bg-theme-surface text-theme-text rounded-lg px-3 py-2 text-sm placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={inviting || !email.trim()}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {inviting ? '…' : 'Inviter'}
        </button>
      </form>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <p className="text-xs text-theme-muted opacity-70">L&apos;utilisateur doit déjà avoir un compte Budgio.</p>

      {/* List */}
      <div className="divide-y divide-theme-border">
        {members.map((m) => {
          const isSelf = m.user.id === currentUserId;
          const isSoleMember = members.length === 1;
          return (
            <div key={m.id} className="flex items-center gap-3 py-3">
              {m.user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.user.avatarUrl} alt={m.user.name} className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-theme-bg flex items-center justify-center text-sm font-bold text-theme-muted">
                  {m.user.name[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-theme-text truncate">
                  {m.user.name}
                  {isSelf && <span className="ml-1.5 text-xs text-theme-muted font-normal">(vous)</span>}
                </p>
                <p className="text-xs text-theme-muted truncate">{m.user.email}</p>
              </div>

              {isSelf ? (
                /* Rôle en lecture seule pour soi-même */
                <span className="text-xs border border-theme-border text-theme-muted rounded-lg px-2 py-1">
                  {m.role === 'ADMIN' ? 'Admin' : 'Membre'}
                </span>
              ) : (
                <select
                  value={m.role}
                  onChange={(e) => handleRoleChange(m.user.id, e.target.value)}
                  className="text-xs border border-theme-border bg-theme-surface text-theme-muted rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="MEMBER">Membre</option>
                  <option value="ADMIN">Admin</option>
                </select>
              )}

              {isSelf && isSoleMember ? (
                /* Seul membre : impossible de quitter, doit désactiver */
                <span className="text-xs text-theme-muted opacity-60 italic">Désactivez le foyer ⇊</span>
              ) : isSelf ? (
                /* Soi-même mais pas seul : on ne peut pas non plus se retirer */
                <span className="w-5" />
              ) : (
                <button
                  onClick={() => handleRemove(m.user.id)}
                  className="text-xs text-theme-muted hover:text-red-500 transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ─── Danger zone ────────────────────────────────────────────────────────── */

function DangerSection({ householdId, token, onDeactivated }: {
  householdId: string; token: string; onDeactivated: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDeactivate() {
    setLoading(true);
    try {
      await api.deactivateHousehold(token, householdId);
      onDeactivated();
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="border border-red-200 dark:border-red-800 rounded-xl p-6 space-y-4">
      <h2 className="font-semibold text-red-600">Zone dangereuse</h2>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-theme-text">Désactiver le foyer</p>
          <p className="text-xs text-theme-muted mt-0.5">Le foyer sera masqué mais les données conservées.</p>
        </div>
        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="text-sm px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
          >
            Désactiver
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setConfirming(false)}
              className="text-sm px-3 py-2 border border-theme-border rounded-lg text-theme-text hover:bg-theme-bg"
            >
              Annuler
            </button>
            <button
              onClick={handleDeactivate}
              disabled={loading}
              className="text-sm px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
            >
              {loading ? '…' : 'Confirmer'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
