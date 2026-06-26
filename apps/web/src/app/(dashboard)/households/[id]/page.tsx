'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import type { Category } from '@budgio/types';
import { MembersPanel } from './MembersPanel';
import { MovementsPanel } from './MovementsPanel';
import { FixedPanel } from './FixedPanel';
import { StatsPanel } from './StatsPanel';


interface HouseholdDetail {
  id: string;
  name: string;
  members: Member[];
}

export interface Member {
  id: string;
  role: 'ADMIN' | 'MEMBER';
  user: { id: string; name: string; email: string; avatarUrl: string | null };
}

type Tab = 'movements' | 'fixed' | 'stats' | 'members';

export default function HouseholdPage() {
  const { token, loading } = useAuth();
  const params = useParams<{ id: string }>();
  const [household, setHousehold] = useState<HouseholdDetail | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [fetching, setFetching] = useState(true);
  const [tab, setTab] = useState<Tab>('movements');

  useEffect(() => {
    if (!token) return;
    Promise.all([
      api.getHousehold(token, params.id),
      api.getCategories(token, params.id),
    ])
      .then(([h, cats]) => {
        setHousehold(h as HouseholdDetail);
        setCategories(cats as Category[]);
      })
      .finally(() => setFetching(false));
  }, [token, params.id]);

  if (loading || fetching) {
    return <div className="text-center py-20 text-theme-muted">Chargement…</div>;
  }

  if (!household) {
    return <div className="text-center py-20 text-red-400">Foyer introuvable.</div>;
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'movements', label: 'Mouvements' },
    { key: 'fixed', label: 'Fixe' },
    { key: 'stats', label: 'Statistiques' },
    { key: 'members', label: `Membres (${household.members.length})` },
  ];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-theme-muted">
        <Link href="/households" className="hover:text-theme-text">Mes foyers</Link>
        <span>/</span>
        <span className="text-theme-text font-medium">{household.name}</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-theme-text">{household.name}</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-theme-border">
        <nav className="-mb-px flex items-center">
          {TABS.filter((t) => t.key !== 'members' && t.key !== 'stats').map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`mr-6 pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-theme-muted hover:text-theme-text'
              }`}
            >
              {t.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-6">
            {(['stats', 'members'] as Tab[]).map((key) => {
              const t = TABS.find((x) => x.key === key)!;
              return (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                    tab === key
                      ? 'border-brand-600 text-brand-600'
                      : 'border-transparent text-theme-muted hover:text-theme-text'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Content */}
      {tab === 'movements' && token && (
        <MovementsPanel householdId={household.id} token={token} />
      )}
      {tab === 'fixed' && token && (
        <FixedPanel householdId={household.id} token={token} categories={categories} />
      )}
      {tab === 'stats' && token && (
        <StatsPanel householdId={household.id} token={token} />
      )}
      {tab === 'members' && token && (
        <MembersPanel
          householdId={household.id}
          members={household.members}
          token={token}
          onMembersChange={(members) => setHousehold((h) => h ? { ...h, members } : h)}
        />
      )}
    </div>
  );
}
