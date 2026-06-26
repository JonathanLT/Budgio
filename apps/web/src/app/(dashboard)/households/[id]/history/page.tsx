'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import type { HouseholdLog } from '@budgio/types';

const EVENT_LABELS: Record<string, string> = {
  HOUSEHOLD_CREATED:    'Foyer créé',
  HOUSEHOLD_RENAMED:    'Foyer renommé',
  HOUSEHOLD_DEACTIVATED:'Foyer désactivé',
  MEMBER_INVITED:       'Membre invité',
  MEMBER_REMOVED:       'Membre retiré',
  MEMBER_ROLE_CHANGED:  'Rôle modifié',
  TRANSACTION_CREATED:  'Transaction créée',
  TRANSACTION_UPDATED:  'Transaction modifiée',
  TRANSACTION_DELETED:  'Transaction supprimée',
  CATEGORY_CREATED:     'Catégorie créée',
  CATEGORY_UPDATED:     'Catégorie modifiée',
  CATEGORY_DELETED:     'Catégorie supprimée',
  RECURRING_CREATED:    'Mouvement fixe créé',
  RECURRING_UPDATED:    'Mouvement fixe modifié',
  RECURRING_DELETED:    'Mouvement fixe désactivé',
};

const EVENT_ICONS: Record<string, string> = {
  HOUSEHOLD_CREATED:    '🏠',
  HOUSEHOLD_RENAMED:    '✏️',
  HOUSEHOLD_DEACTIVATED:'🗑️',
  MEMBER_INVITED:       '👋',
  MEMBER_REMOVED:       '👋',
  MEMBER_ROLE_CHANGED:  '🔑',
  TRANSACTION_CREATED:  '💳',
  TRANSACTION_UPDATED:  '💳',
  TRANSACTION_DELETED:  '💳',
  CATEGORY_CREATED:     '🏷️',
  CATEGORY_UPDATED:     '🏷️',
  CATEGORY_DELETED:     '🏷️',
  RECURRING_CREATED:    '📌',
  RECURRING_UPDATED:    '📌',
  RECURRING_DELETED:    '📌',
};

function formatMeta(event: string, meta: Record<string, unknown> | null): string | null {
  if (!meta) return null;
  switch (event) {
    case 'HOUSEHOLD_CREATED':
    case 'HOUSEHOLD_RENAMED':
      return meta.name ? `« ${meta.name} »` : null;
    case 'MEMBER_INVITED':
      return meta.email ? String(meta.email) : null;
    case 'MEMBER_ROLE_CHANGED':
      return meta.role ? `→ ${meta.role}` : null;
    case 'TRANSACTION_CREATED':
    case 'TRANSACTION_UPDATED':
      return meta.label ? String(meta.label) : null;
    case 'CATEGORY_CREATED':
    case 'CATEGORY_UPDATED':
      return meta.label ? String(meta.label) : null;
    case 'RECURRING_CREATED':
      return meta.label ? String(meta.label) : null;
    default:
      return null;
  }
}

function groupByDate(logs: HouseholdLog[]): [string, HouseholdLog[]][] {
  const groups: Map<string, HouseholdLog[]> = new Map();
  for (const log of logs) {
    const key = new Date(log.createdAt).toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(log);
  }
  return Array.from(groups.entries());
}

export default function HouseholdHistoryPage() {
  const { token, loading } = useAuth();
  const params = useParams<{ id: string }>();
  const [logs, setLogs] = useState<HouseholdLog[]>([]);
  const [householdName, setHouseholdName] = useState('');
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.getHouseholdHistory(token, params.id) as Promise<HouseholdLog[]>,
      api.getHousehold(token, params.id) as Promise<{ name: string }>,
    ])
      .then(([history, household]) => {
        setLogs(history);
        setHouseholdName(household.name);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setFetching(false));
  }, [token, params.id]);

  if (loading || fetching) return <div className="text-center py-20 text-theme-muted">Chargement…</div>;
  if (error) return <div className="text-center py-20 text-red-400">{error}</div>;

  const groups = groupByDate(logs);

  return (
    <div className="space-y-8 max-w-2xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-theme-muted">
        <Link href="/households" className="hover:text-theme-text">Mes foyers</Link>
        <span>/</span>
        <Link href={`/households/${params.id}`} className="hover:text-theme-text">{householdName}</Link>
        <span>/</span>
        <Link href={`/households/${params.id}/settings`} className="hover:text-theme-text">Paramètres</Link>
        <span>/</span>
        <span className="text-theme-text font-medium">Historique</span>
      </div>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-theme-text">Historique du foyer</h1>
        <span className="text-sm text-theme-muted">{logs.length} événement{logs.length > 1 ? 's' : ''}</span>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-16 text-theme-muted">
          <p className="text-3xl mb-3">📋</p>
          <p className="text-sm">Aucun événement enregistré.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([date, entries]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-theme-muted uppercase tracking-wider mb-2 px-1">
                {date}
              </p>
              <div className="bg-theme-surface border border-theme-border rounded-xl divide-y divide-theme-border">
                {entries.map((log) => {
                  const label = EVENT_LABELS[log.event] ?? log.event;
                  const icon = EVENT_ICONS[log.event] ?? '•';
                  const detail = formatMeta(log.event, log.meta);
                  const time = new Date(log.createdAt).toLocaleTimeString('fr-FR', {
                    hour: '2-digit', minute: '2-digit',
                  });

                  return (
                    <div key={log.id} className="flex items-center gap-4 px-5 py-3">
                      <span className="text-lg w-6 text-center shrink-0">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-theme-text font-medium">
                          {label}
                          {detail && (
                            <span className="ml-1.5 font-normal text-theme-muted">{detail}</span>
                          )}
                        </p>
                        {log.user && (
                          <p className="text-xs text-theme-muted mt-0.5">
                            par {log.user.name}
                          </p>
                        )}
                      </div>
                      <time className="text-xs text-theme-muted shrink-0">{time}</time>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
