'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { HouseholdStats } from '@budgio/types';

const MONTH_SHORT = ['jan.', 'fév.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sep.', 'oct.', 'nov.', 'déc.'];
const MONTH_LONG  = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

/* ─── Tooltip ─────────────────────────────────────────────────────────────── */

function CurrencyTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-theme-surface border border-theme-border rounded-xl shadow-lg px-4 py-3 text-sm space-y-1 min-w-[140px]">
      <p className="text-theme-muted font-medium mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold tabular-nums">
          {p.name} : {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { color: string } }>;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="bg-theme-surface border border-theme-border rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold" style={{ color: p.payload.color }}>{p.name}</p>
      <p className="text-red-500 font-bold tabular-nums">{formatCurrency(-p.value)}</p>
    </div>
  );
}

/* ─── KPI cards ───────────────────────────────────────────────────────────── */

function KpiCard({ label, value, sub, positive, accent }: {
  label: string;
  value: string;
  sub?: string;
  positive?: boolean;
  accent?: boolean;
}) {
  return (
    <div className={`border rounded-xl p-4 space-y-1 ${
      accent
        ? 'bg-brand-50 dark:bg-brand-600/10 border-brand-200 dark:border-brand-700'
        : 'bg-theme-surface border-theme-border'
    }`}>
      <p className="text-xs text-theme-muted uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold tabular-nums ${
        positive === undefined ? 'text-theme-text' :
        positive ? 'text-green-600' : 'text-red-500'
      }`}>
        {value}
      </p>
      {sub && <p className="text-xs text-theme-muted truncate" title={sub}>{sub}</p>}
    </div>
  );
}

function TrendBadge({ value, invertColor }: { value: number; invertColor?: boolean }) {
  if (value === 0) return <span className="text-theme-muted text-xs">—</span>;
  const up = value > 0;
  const isPositive = invertColor ? !up : up;
  return (
    <span className={`text-xs font-semibold ${isPositive ? 'text-green-600' : 'text-red-500'}`}>
      {up ? '↑' : '↓'} {Math.abs(value)} %
    </span>
  );
}

/* ─── Main panel ──────────────────────────────────────────────────────────── */

interface Props {
  householdId: string;
  token: string;
}

export function StatsPanel({ householdId, token }: Props) {
  const [stats, setStats] = useState<HouseholdStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getStats(token, householdId)
      .then((s) => setStats(s as HouseholdStats))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, householdId]);

  if (loading) return <div className="text-center py-16 text-theme-muted">Chargement…</div>;
  if (error)   return <div className="text-center py-16 text-red-400">{error}</div>;
  if (!stats)  return null;

  const hasData = stats.months.some((m) => m.totalIn !== 0 || m.totalOut !== 0);

  const chartData = stats.months.map((m) => ({
    name: MONTH_SHORT[m.month - 1],
    solde:   Math.round(m.closingBalance * 100) / 100,
    entrées: Math.round(m.totalIn * 100) / 100,
    sorties: Math.round(Math.abs(m.totalOut) * 100) / 100,
  }));

  const pieData = stats.topExpenseCategories.map((c) => ({
    name:  c.label,
    value: Math.abs(c.total),
    color: c.color,
  }));

  const axisStyle  = { fontSize: 11, fill: '#94a3b8' };
  const gridColor  = 'var(--color-border, #e2e8f0)';
  const yFormatter = (v: number) =>
    `${v < 0 ? '-' : ''}${Math.abs(v) >= 1000 ? `${Math.round(Math.abs(v) / 100) / 10}k` : Math.round(Math.abs(v))}`;

  const bestMonth  = stats.bestSavingsMonth;
  const worst      = stats.worstMonth;

  return (
    <div className="space-y-5">

      {/* ── Row 1 : solde & moyennes ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          label="Solde actuel"
          value={`${stats.currentBalance >= 0 ? '+' : ''}${formatCurrency(stats.currentBalance)}`}
          positive={stats.currentBalance >= 0}
          accent
        />
        <KpiCard
          label="Revenus / mois"
          value={`+${formatCurrency(stats.avgMonthlyIn)}`}
          sub="moy. 12 mois"
          positive
        />
        <KpiCard
          label="Dépenses / mois"
          value={formatCurrency(stats.avgMonthlyOut)}
          sub="moy. 12 mois"
          positive={false}
        />
        <KpiCard
          label="Taux d'épargne"
          value={`${stats.savingsRate} %`}
          sub="sur 12 mois"
          positive={stats.savingsRate >= 0}
        />
      </div>

      {/* ── Row 2 : insights ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          label="Transactions"
          value={String(stats.transactionCount)}
          sub="sur 12 mois"
        />
        <KpiCard
          label="Plus grosse dépense"
          value={stats.biggestExpense ? formatCurrency(stats.biggestExpense.amount) : '—'}
          sub={stats.biggestExpense?.label}
          positive={false}
        />
        <KpiCard
          label="Plus grand revenu"
          value={stats.biggestIncome ? `+${formatCurrency(stats.biggestIncome.amount)}` : '—'}
          sub={stats.biggestIncome?.label}
          positive
        />
        <div className="bg-theme-surface border border-theme-border rounded-xl p-4 space-y-2">
          <p className="text-xs text-theme-muted uppercase tracking-wide">Tendance (3 mois)</p>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-theme-muted">Revenus</span>
              <TrendBadge value={stats.trend.incomeChange} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-theme-muted">Dépenses</span>
              <TrendBadge value={stats.trend.expenseChange} invertColor />
            </div>
          </div>
          <p className="text-xs text-theme-muted opacity-60">vs 3 mois précédents</p>
        </div>
      </div>

      {/* ── Row 3 : meilleur / pire mois ── */}
      {(bestMonth || worst) && (
        <div className="grid grid-cols-2 gap-3">
          {bestMonth && (
            <KpiCard
              label="Meilleur mois d'épargne"
              value={`+${formatCurrency(bestMonth.amount)}`}
              sub={`${MONTH_LONG[bestMonth.month - 1]} ${bestMonth.year}`}
              positive
            />
          )}
          {worst && (
            <KpiCard
              label="Mois le plus dépensier"
              value={formatCurrency(worst.amount)}
              sub={`${MONTH_LONG[worst.month - 1]} ${worst.year}`}
              positive={false}
            />
          )}
        </div>
      )}

      {!hasData ? (
        <div className="text-center py-16 text-theme-muted">
          <p className="text-3xl mb-3">📊</p>
          <p className="text-sm">Aucune transaction enregistrée sur les 12 derniers mois.</p>
        </div>
      ) : (
        <>
          {/* ── Balance trend ── */}
          <div className="bg-theme-surface border border-theme-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-theme-text">Évolution du solde</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradSolde" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={60} tickFormatter={yFormatter} />
                <Tooltip content={<CurrencyTooltip />} />
                <Area
                  type="monotone"
                  dataKey="solde"
                  name="Solde"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#gradSolde)"
                  dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* ── Entrées vs Sorties ── */}
          <div className="bg-theme-surface border border-theme-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-theme-text">Entrées vs Dépenses</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
                <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={60} tickFormatter={yFormatter} />
                <Tooltip content={<CurrencyTooltip />} />
                <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="entrées" name="Entrées" fill="#22c55e" fillOpacity={0.85} radius={[3, 3, 0, 0]} />
                <Bar dataKey="sorties" name="Sorties" fill="#ef4444" fillOpacity={0.85} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ── Donut répartition dépenses ── */}
          {pieData.length > 0 && (
            <div className="bg-theme-surface border border-theme-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-theme-text mb-4">Répartition des dépenses</h3>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} fillOpacity={0.9} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2 w-full">
                  {stats.topExpenseCategories.map((cat) => {
                    const maxAbs = Math.abs(stats.topExpenseCategories[0].total);
                    const pct = Math.round((Math.abs(cat.total) / maxAbs) * 100);
                    return (
                      <div key={cat.id} className="flex items-center gap-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium w-28 text-center truncate shrink-0"
                          style={{ backgroundColor: cat.color + '33', color: cat.color }}
                        >
                          {cat.label}
                        </span>
                        <div className="flex-1 bg-theme-bg rounded-full h-2">
                          <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                        </div>
                        <span className="text-sm font-medium text-red-500 w-20 text-right tabular-nums shrink-0">
                          {formatCurrency(cat.total)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Top income categories ── */}
          {stats.topIncomeCategories.length > 0 && (
            <div className="bg-theme-surface border border-theme-border rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-theme-text">Principales entrées (12 mois)</h3>
              {stats.topIncomeCategories.map((cat) => {
                const maxVal = stats.topIncomeCategories[0].total;
                const pct    = Math.round((cat.total / maxVal) * 100);
                return (
                  <div key={cat.id} className="flex items-center gap-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium w-28 text-center truncate shrink-0"
                      style={{ backgroundColor: cat.color + '33', color: cat.color }}
                    >
                      {cat.label}
                    </span>
                    <div className="flex-1 bg-theme-bg rounded-full h-2">
                      <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                    </div>
                    <span className="text-sm font-medium text-green-600 w-20 text-right tabular-nums shrink-0">
                      +{formatCurrency(cat.total)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Tableau mensuel ── */}
          <div className="bg-theme-surface border border-theme-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-theme-border">
              <h3 className="text-sm font-semibold text-theme-text">Récapitulatif mensuel</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-theme-border">
                    <th className="text-left px-5 py-2.5 text-xs font-medium text-theme-muted uppercase tracking-wide">Mois</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-theme-muted uppercase tracking-wide">Entrées</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-theme-muted uppercase tracking-wide">Sorties</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium text-theme-muted uppercase tracking-wide">Net</th>
                    <th className="text-right px-5 py-2.5 text-xs font-medium text-theme-muted uppercase tracking-wide">Solde</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-theme-border">
                  {[...stats.months].reverse().map((m) => {
                    const net = m.totalIn + m.totalOut;
                    const isCurrentMonth = m.year === new Date().getFullYear() && m.month === new Date().getMonth() + 1;
                    return (
                      <tr
                        key={`${m.year}-${m.month}`}
                        className={isCurrentMonth ? 'bg-brand-50/50 dark:bg-brand-600/5' : 'hover:bg-theme-bg/50'}
                      >
                        <td className="px-5 py-3 text-theme-text font-medium">
                          {MONTH_LONG[m.month - 1]} {m.year}
                          {isCurrentMonth && (
                            <span className="ml-2 text-xs bg-brand-100 dark:bg-brand-800/40 text-brand-600 dark:text-brand-400 px-1.5 py-0.5 rounded-full">
                              En cours
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-green-600 font-medium tabular-nums">
                          {m.totalIn > 0 ? `+${formatCurrency(m.totalIn)}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-red-500 font-medium tabular-nums">
                          {m.totalOut < 0 ? formatCurrency(m.totalOut) : '—'}
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold tabular-nums ${
                          net > 0 ? 'text-green-600' : net < 0 ? 'text-red-500' : 'text-theme-muted'
                        }`}>
                          {net > 0 ? '+' : ''}{net !== 0 ? formatCurrency(net) : '—'}
                        </td>
                        <td className={`px-5 py-3 text-right font-semibold tabular-nums ${
                          m.closingBalance >= 0 ? 'text-theme-text' : 'text-red-500'
                        }`}>
                          {m.closingBalance >= 0 ? '+' : ''}{formatCurrency(m.closingBalance)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
