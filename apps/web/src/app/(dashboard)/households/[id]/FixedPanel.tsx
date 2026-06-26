'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { AddRecurringModal } from './AddRecurringModal';
import type { Category, RecurringTransaction, FrequencyType } from '@budgio/types';

interface Props {
  householdId: string;
  token: string;
  categories: Category[];
}

const DAYS_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

function formatFrequency(rt: RecurringTransaction): string {
  switch (rt.frequency as FrequencyType) {
    case 'DAILY':    return 'Tous les jours';
    case 'WEEKDAYS': return 'Lun – Ven';
    case 'WEEKLY':   return `Tous les ${DAYS_FR[rt.dayOfWeek ?? 1]}s`;
    case 'MONTHLY':  return `Le ${rt.dayOfMonth} de chaque mois`;
    case 'YEARLY':   return `Le ${rt.dayOfMonth} ${MONTHS_FR[(rt.month ?? 1) - 1]}`;
    default:         return '—';
  }
}

function formatLastRun(iso: string | null): string {
  if (!iso) return 'Jamais exécuté';
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Il y a 1 jour';
  return `Il y a ${days} jours`;
}

export function FixedPanel({ householdId, token, categories }: Props) {
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingRt, setEditingRt] = useState<RecurringTransaction | null>(null);
  const [replaying, setReplaying] = useState(false);
  const [replayResult, setReplayResult] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .getRecurring(token, householdId)
      .then((data) => setRecurring(data as RecurringTransaction[]))
      .finally(() => setLoading(false));
  }, [token, householdId]);

  async function handleDelete(id: string) {
    await api.deleteRecurring(token, householdId, id);
    setRecurring((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleReplay() {
    setReplaying(true);
    setReplayResult(null);
    try {
      const result = await api.replayRecurringMonth(token, householdId) as { created: number };
      setReplayResult(result.created);
    } finally {
      setReplaying(false);
    }
  }

  if (loading) {
    return <div className="text-center py-10 text-theme-muted">Chargement…</div>;
  }

  const now = new Date();
  const monthLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-theme-muted">
          {recurring.length === 0
            ? 'Aucun mouvement fixe configuré.'
            : `${recurring.length} mouvement${recurring.length > 1 ? 's' : ''} fixe${recurring.length > 1 ? 's' : ''}`}
        </p>
        <div className="flex items-center gap-2">
          {recurring.length > 0 && (
            <button
              onClick={handleReplay}
              disabled={replaying}
              title={`Rejouer les mouvements fixes du 1er au ${now.getDate()} ${monthLabel}`}
              className="text-sm px-4 py-2 border border-theme-border text-theme-text rounded-lg hover:bg-theme-bg disabled:opacity-50 transition-colors font-medium flex items-center gap-1.5"
            >
              {replaying ? (
                <span className="animate-spin inline-block">↻</span>
              ) : (
                <span>↻</span>
              )}
              Rejouer le mois
            </button>
          )}
          <button
            onClick={() => setShowAdd(true)}
            className="text-sm px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
          >
            + Mouvement fixe
          </button>
        </div>
      </div>

      {replayResult !== null && (
        <div className={`text-sm px-4 py-3 rounded-xl border ${
          replayResult === 0
            ? 'bg-theme-bg border-theme-border text-theme-muted'
            : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
        }`}>
          {replayResult === 0
            ? 'Aucune transaction à générer — tout est déjà à jour.'
            : `${replayResult} transaction${replayResult > 1 ? 's' : ''} générée${replayResult > 1 ? 's' : ''} avec succès.`}
        </div>
      )}

      {recurring.length > 0 && (
        <div className="bg-theme-surface rounded-xl border border-theme-border divide-y divide-theme-border">
          {recurring.map((rt) => {
            const isIn = rt.amount > 0;
            return (
              <div key={rt.id} className="flex items-center justify-between px-5 py-4 group">
                <div className="flex items-center gap-4">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg ${
                    isIn ? 'bg-green-50 dark:bg-green-900/30 text-green-500' : 'bg-red-50 dark:bg-red-900/30 text-red-400'
                  }`}>
                    {isIn ? '↑' : '↓'}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-theme-text">{rt.label}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {rt.category && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                          style={{
                            backgroundColor: rt.category.color + '33',
                            color: rt.category.color,
                          }}
                        >
                          {rt.category.label}
                        </span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full bg-theme-bg text-theme-muted font-medium">
                        {formatFrequency(rt)}
                      </span>
                      <span className="text-xs text-theme-muted opacity-70">
                        {formatLastRun(rt.lastRunDate)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-semibold ${isIn ? 'text-green-600' : 'text-red-500'}`}>
                    {isIn ? '+' : ''}{formatCurrency(rt.amount)}
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1.5 transition-all">
                    <button
                      onClick={() => setEditingRt(rt)}
                      className="text-theme-muted hover:text-brand-500 transition-colors text-sm"
                      title="Modifier"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(rt.id)}
                      className="text-theme-muted hover:text-red-500 transition-colors"
                      title="Supprimer"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {recurring.length === 0 && (
        <div className="text-center py-16 text-theme-muted">
          <p className="text-3xl mb-3">📌</p>
          <p className="text-sm">
            Les mouvements fixes sont automatiquement insérés dans vos mouvements à la bonne date.
          </p>
        </div>
      )}

      {showAdd && (
        <AddRecurringModal
          token={token}
          householdId={householdId}
          categories={categories}
          onClose={() => setShowAdd(false)}
          onSaved={(rt) => {
            setRecurring((prev) => [...prev, rt]);
            setShowAdd(false);
          }}
        />
      )}

      {editingRt && (
        <AddRecurringModal
          token={token}
          householdId={householdId}
          categories={categories}
          initialData={editingRt}
          onClose={() => setEditingRt(null)}
          onSaved={(rt) => {
            setRecurring((prev) => prev.map((r) => r.id === rt.id ? rt : r));
            setEditingRt(null);
          }}
        />
      )}
    </div>
  );
}
