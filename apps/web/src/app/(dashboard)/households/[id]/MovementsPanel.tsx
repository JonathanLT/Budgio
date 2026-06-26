'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency, formatDate, MONTHS_FR } from '@/lib/utils';
import { AddTransactionModal } from './AddTransactionModal';
import type { Category, Transaction, Dashboard } from '@budgio/types';

interface Props {
  householdId: string;
  token: string;
}

type Direction = 'all' | 'in' | 'out';

export function MovementsPanel({ householdId, token }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTous, setFilterTous] = useState(true);
  const [filterFixes, setFilterFixes] = useState(true);
  const [direction, setDirection] = useState<Direction>('all');
  const [categoryDisplay, setCategoryDisplay] = useState<'amount' | 'percent'>('amount');
  const [showAdd, setShowAdd] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(now.getFullYear());
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPicker) return;
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPicker]);

  useEffect(() => {
    api.getCategories(token, householdId).then((cats) => setCategories(cats as Category[]));
  }, [token, householdId]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getTransactions(token, householdId, year, month),
      api.getDashboard(token, householdId, year, month),
    ])
      .then(([txs, dash]) => {
        setTransactions(txs as Transaction[]);
        setDashboard(dash as Dashboard);
      })
      .finally(() => setLoading(false));
  }, [token, householdId, year, month]);

  function prevMonth() {
    if (month === 1) { setYear((y) => y - 1); setMonth(12); }
    else setMonth((m) => m - 1);
  }

  function nextMonth() {
    if (month === 12) { setYear((y) => y + 1); setMonth(1); }
    else setMonth((m) => m + 1);
  }

  async function deleteTransaction(id: string) {
    await api.deleteTransaction(token, householdId, id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    refreshDashboard();
  }

  async function refreshDashboard() {
    const dash = await api.getDashboard(token, householdId, year, month);
    setDashboard(dash as Dashboard);
  }

  const visible = transactions.filter((t) => {
    const isFixed = t.isRecurring;
    if (!filterTous && !isFixed) return false;
    if (!filterFixes && isFixed) return false;
    if (direction === 'in') return t.amount > 0;
    if (direction === 'out') return t.amount < 0;
    return true;
  });

  function clickTous() {
    setDirection('all');
    if (filterFixes) setFilterTous((v) => !v);
    // else: Tous is the only active type — just reset direction
  }

  function clickFixes() {
    const next = !filterFixes;
    if (!next && !filterTous) return; // keep at least one active
    setFilterFixes(next);
  }

  function clickDirection(d: 'in' | 'out') {
    setDirection((prev) => (prev === d ? 'all' : d));
  }

  return (
    <div className="space-y-6">
      {/* Month selector */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-theme-bg transition-colors text-xl text-theme-muted">‹</button>

        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => { setPickerYear(year); setShowPicker((v) => !v); }}
            className="text-lg font-semibold text-theme-text hover:text-brand-600 transition-colors px-2 py-1 rounded-lg hover:bg-theme-bg"
          >
            {MONTHS_FR[month - 1]} {year}
          </button>

          {showPicker && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-20 bg-theme-surface border border-theme-border rounded-xl shadow-lg p-4 w-64">
              {/* Year nav */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => setPickerYear((y) => y - 1)}
                  className="p-1 rounded hover:bg-theme-bg text-theme-muted"
                >
                  ‹
                </button>
                <span className="font-semibold text-theme-text">{pickerYear}</span>
                <button
                  onClick={() => setPickerYear((y) => y + 1)}
                  className="p-1 rounded hover:bg-theme-bg text-theme-muted"
                >
                  ›
                </button>
              </div>

              {/* Month grid */}
              <div className="grid grid-cols-3 gap-1">
                {MONTHS_FR.map((m, i) => {
                  const isSelected = pickerYear === year && i + 1 === month;
                  return (
                    <button
                      key={m}
                      onClick={() => {
                        setYear(pickerYear);
                        setMonth(i + 1);
                        setShowPicker(false);
                      }}
                      className={`py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-brand-600 text-white'
                          : 'text-theme-text hover:bg-theme-bg'
                      }`}
                    >
                      {m.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-theme-bg transition-colors text-xl text-theme-muted">›</button>
      </div>

      {/* KPI cards */}
      {dashboard && (
        <div className="space-y-3">
          <div className="bg-theme-bg border border-theme-border rounded-xl px-5 py-3 flex items-center justify-between">
            <span className="text-sm text-theme-muted">Solde début de mois</span>
            <span className={`font-semibold ${dashboard.openingBalance >= 0 ? 'text-theme-text' : 'text-red-500'}`}>
              {dashboard.openingBalance >= 0 ? '+' : ''}{formatCurrency(dashboard.openingBalance)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-theme-surface rounded-xl border border-theme-border p-4 space-y-1">
              <p className="text-xs text-theme-muted uppercase tracking-wide">Entrées</p>
              <p className="text-xl font-bold text-green-600">+{formatCurrency(dashboard.totalIn)}</p>
            </div>
            <div className="bg-theme-surface rounded-xl border border-theme-border p-4 space-y-1">
              <p className="text-xs text-theme-muted uppercase tracking-wide">Sorties</p>
              <p className="text-xl font-bold text-red-500">{formatCurrency(dashboard.totalOut)}</p>
            </div>
          </div>

          <div className={`rounded-xl border px-5 py-3 flex items-center justify-between ${
            dashboard.closingBalance >= 0
              ? 'bg-brand-50 dark:bg-brand-600/10 border-brand-200 dark:border-brand-700'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}>
            <span className="text-sm font-medium text-theme-muted">Solde fin de mois</span>
            <span className={`text-lg font-bold ${dashboard.closingBalance >= 0 ? 'text-brand-700 dark:text-brand-400' : 'text-red-600'}`}>
              {dashboard.closingBalance >= 0 ? '+' : ''}{formatCurrency(dashboard.closingBalance)}
            </span>
          </div>
        </div>
      )}

      {/* Filter + add button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-theme-bg rounded-lg p-1">
          {([
            { label: 'Tous',    active: filterTous,           onClick: clickTous },
            { label: 'Fixes',   active: filterFixes,          onClick: clickFixes },
          ] as { label: string; active: boolean; onClick: () => void }[]).map((f) => (
            <button
              key={f.label}
              onClick={f.onClick}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                f.active
                  ? 'bg-theme-surface text-theme-text shadow-sm'
                  : 'text-theme-muted hover:text-theme-text'
              }`}
            >
              {f.label}
            </button>
          ))}
          <div className="w-px h-4 bg-theme-border mx-0.5" />
          {([
            { label: 'Entrées', active: direction === 'in',  onClick: () => clickDirection('in') },
            { label: 'Sorties', active: direction === 'out', onClick: () => clickDirection('out') },
          ] as { label: string; active: boolean; onClick: () => void }[]).map((f) => (
            <button
              key={f.label}
              onClick={f.onClick}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                f.active
                  ? 'bg-theme-surface text-theme-text shadow-sm'
                  : 'text-theme-muted hover:text-theme-text'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="text-sm px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
        >
          <span className="sm:hidden text-lg leading-none">+</span>
          <span className="hidden sm:inline">+ Transaction</span>
        </button>
      </div>

      {/* Transactions list */}
      {loading ? (
        <div className="text-center py-10 text-theme-muted">Chargement…</div>
      ) : (
        <div className="bg-theme-surface rounded-xl border border-theme-border divide-y divide-theme-border">
          {visible.map((tx) => {
            const isIn = tx.amount > 0;
            return (
              <div key={tx.id} className="flex items-center justify-between px-5 py-4 group">
                <div className="flex items-center gap-4">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg ${isIn ? 'bg-green-50 dark:bg-green-900/30 text-green-500' : 'bg-red-50 dark:bg-red-900/30 text-red-400'}`}>
                    {isIn ? '↑' : '↓'}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-theme-text">{tx.label}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {tx.category && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: tx.category.color + '33', color: tx.category.color }}
                        >
                          {tx.category.label}
                        </span>
                      )}
                      <span className="text-xs text-theme-muted opacity-70">{formatDate(tx.date)}</span>
                      <span className="text-xs text-theme-muted opacity-70">{tx.createdBy.name}</span>
                      {tx.isRecurring && <span className="text-xs text-blue-400">↺</span>}
                      {tx.attachmentUrl && (
                        <a href={tx.attachmentUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline">
                          📎
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-semibold ${isIn ? 'text-green-600' : 'text-red-500'}`}>
                    {isIn ? '+' : ''}{formatCurrency(tx.amount)}
                  </span>
                  <button
                    onClick={() => setEditingTx(tx)}
                    className="opacity-0 group-hover:opacity-100 text-theme-muted hover:text-brand-600 transition-all"
                    title="Modifier"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => deleteTransaction(tx.id)}
                    className="opacity-0 group-hover:opacity-100 text-theme-muted hover:text-red-500 transition-all"
                    title="Supprimer"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}

          {visible.length === 0 && (
            <div className="text-center py-12 text-theme-muted">
              <p className="text-3xl mb-3">📭</p>
              <p>Aucune transaction pour ce mois.</p>
            </div>
          )}
        </div>
      )}

      {/* Category breakdown */}
      {dashboard && dashboard.byCategory.length > 0 && (
        <div className="bg-theme-surface rounded-xl border border-theme-border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-theme-text">Mouvements par catégorie</h3>
            <div className="flex rounded-lg overflow-hidden border border-theme-border text-xs">
              <button
                onClick={() => setCategoryDisplay('amount')}
                className={`px-2.5 py-1 font-medium transition-colors ${
                  categoryDisplay === 'amount'
                    ? 'bg-theme-text text-theme-bg'
                    : 'bg-theme-surface text-theme-muted hover:bg-theme-bg'
                }`}
              >
                €
              </button>
              <button
                onClick={() => setCategoryDisplay('percent')}
                className={`px-2.5 py-1 font-medium transition-colors ${
                  categoryDisplay === 'percent'
                    ? 'bg-theme-text text-theme-bg'
                    : 'bg-theme-surface text-theme-muted hover:bg-theme-bg'
                }`}
              >
                %
              </button>
            </div>
          </div>

          {/* Sorties */}
          {dashboard.byCategory.filter((c) => c.total < 0).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-theme-muted uppercase tracking-wide">Sorties</p>
              {dashboard.byCategory
                .filter((c) => c.total < 0)
                .sort((a, b) => a.total - b.total)
                .map(({ id, label, color, total }) => {
                  const pct = Math.round((Math.abs(total) / Math.abs(dashboard.totalOut || 1)) * 100);
                  return (
                    <div key={id} className="flex items-center gap-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium w-28 text-center truncate"
                        style={{ backgroundColor: color + '33', color }}
                      >
                        {label}
                      </span>
                      <div className="flex-1 bg-theme-bg rounded-full h-2">
                        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                      <span className="text-sm font-medium text-red-500 w-20 text-right tabular-nums">
                        {categoryDisplay === 'percent' ? `${pct} %` : formatCurrency(total)}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Entrées */}
          {dashboard.byCategory.filter((c) => c.total > 0).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-theme-muted uppercase tracking-wide">Entrées</p>
              {dashboard.byCategory
                .filter((c) => c.total > 0)
                .sort((a, b) => b.total - a.total)
                .map(({ id, label, color, total }) => {
                  const pct = Math.round((total / (dashboard.totalIn || 1)) * 100);
                  return (
                    <div key={id} className="flex items-center gap-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium w-28 text-center truncate"
                        style={{ backgroundColor: color + '33', color }}
                      >
                        {label}
                      </span>
                      <div className="flex-1 bg-theme-bg rounded-full h-2">
                        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                      <span className="text-sm font-medium text-green-600 w-20 text-right tabular-nums">
                        {categoryDisplay === 'percent' ? `${pct} %` : `+${formatCurrency(total)}`}
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <AddTransactionModal
          token={token}
          householdId={householdId}
          year={year}
          month={month}
          categories={categories}
          onClose={() => setShowAdd(false)}
          onSaved={async (tx) => {
            setTransactions((prev) => [tx as Transaction, ...prev]);
            setShowAdd(false);
            refreshDashboard();
          }}
        />
      )}

      {editingTx && (
        <AddTransactionModal
          token={token}
          householdId={householdId}
          year={year}
          month={month}
          categories={categories}
          transaction={editingTx}
          onClose={() => setEditingTx(null)}
          onSaved={async (updated) => {
            setTransactions((prev) =>
              prev.map((t) => (t.id === (updated as Transaction).id ? (updated as Transaction) : t)),
            );
            setEditingTx(null);
            refreshDashboard();
          }}
        />
      )}
    </div>
  );
}
