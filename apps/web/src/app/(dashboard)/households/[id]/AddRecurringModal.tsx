'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import type { Category, FrequencyType, RecurringTransaction } from '@budgio/types';

const DAYS_FR = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const MONTHS_FR = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

const FREQUENCIES: { value: FrequencyType; label: string }[] = [
  { value: 'DAILY',    label: 'Tous les jours' },
  { value: 'WEEKDAYS', label: 'Du lundi au vendredi' },
  { value: 'WEEKLY',   label: 'Toutes les semaines' },
  { value: 'MONTHLY',  label: 'Tous les mois' },
  { value: 'YEARLY',   label: 'Tous les ans' },
];

interface Props {
  token: string;
  householdId: string;
  categories: Category[];
  initialData?: RecurringTransaction;
  onClose: () => void;
  onSaved: (rt: RecurringTransaction) => void;
}

type Direction = 'in' | 'out';

export function AddRecurringModal({ token, householdId, categories, initialData, onClose, onSaved }: Props) {
  const isEdit = !!initialData;

  const [direction, setDirection] = useState<Direction>(
    initialData ? (initialData.amount > 0 ? 'in' : 'out') : 'out',
  );
  const [label, setLabel] = useState(initialData?.label ?? '');
  const [amount, setAmount] = useState(initialData ? String(Math.abs(initialData.amount)) : '');
  const [categoryId, setCategoryId] = useState(initialData?.category?.id ?? '');
  const [frequency, setFrequency] = useState<FrequencyType>(initialData?.frequency ?? 'MONTHLY');
  const [dayOfWeek, setDayOfWeek] = useState(initialData?.dayOfWeek ?? 1);
  const [dayOfMonth, setDayOfMonth] = useState(initialData?.dayOfMonth ?? 1);
  const [month, setMonth] = useState(initialData?.month ?? 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label || !amount) return;
    setSaving(true);
    setError('');
    try {
      const signedAmount = direction === 'out' ? -Math.abs(parseFloat(amount)) : Math.abs(parseFloat(amount));
      const payload: Record<string, unknown> = {
        label,
        amount: signedAmount,
        frequency,
        categoryId: categoryId || null,
      };
      if (frequency === 'WEEKLY')  payload.dayOfWeek  = dayOfWeek;
      if (frequency === 'MONTHLY') payload.dayOfMonth = dayOfMonth;
      if (frequency === 'YEARLY')  { payload.dayOfMonth = dayOfMonth; payload.month = month; }

      let rt: unknown;
      if (isEdit) {
        rt = await api.updateRecurring(token, householdId, initialData.id, payload);
      } else {
        rt = await api.createRecurring(token, householdId, payload);
      }
      onSaved(rt as RecurringTransaction);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-theme-surface rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-theme-text">
            {isEdit ? 'Modifier le mouvement fixe' : 'Nouveau mouvement fixe'}
          </h2>
          <button onClick={onClose} className="text-theme-muted hover:text-theme-text text-xl">✕</button>
        </div>

        {/* Direction */}
        <div className="flex rounded-lg overflow-hidden border border-theme-border">
          <button
            type="button"
            onClick={() => setDirection('out')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              direction === 'out' ? 'bg-red-500 text-white' : 'bg-theme-surface text-theme-muted hover:bg-theme-bg'
            }`}
          >
            ↓ Sortie
          </button>
          <button
            type="button"
            onClick={() => setDirection('in')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              direction === 'in' ? 'bg-green-500 text-white' : 'bg-theme-surface text-theme-muted hover:bg-theme-bg'
            }`}
          >
            ↑ Entrée
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">Libellé</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ex: Loyer, Salaire…"
              className="w-full border border-theme-border bg-theme-surface text-theme-text rounded-lg px-3 py-2 text-sm placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-brand-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">Montant (€)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full border border-theme-border bg-theme-surface text-theme-text rounded-lg px-3 py-2 text-sm placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">
                Catégorie <span className="text-theme-muted font-normal">(opt.)</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full border border-theme-border bg-theme-surface text-theme-text rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">— Aucune —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Fréquence */}
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">Fréquence</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as FrequencyType)}
              className="w-full border border-theme-border bg-theme-surface text-theme-text rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {frequency === 'WEEKLY' && (
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">Chaque…</label>
              <select
                value={dayOfWeek}
                onChange={(e) => setDayOfWeek(+e.target.value)}
                className="w-full border border-theme-border bg-theme-surface text-theme-text rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {DAYS_FR.map((d, i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
            </div>
          )}

          {frequency === 'MONTHLY' && (
            <div>
              <label className="block text-sm font-medium text-theme-text mb-1">Le ___ de chaque mois</label>
              <input
                type="number"
                min="1"
                max="31"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(+e.target.value)}
                className="w-full border border-theme-border bg-theme-surface text-theme-text rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          )}

          {frequency === 'YEARLY' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-theme-text mb-1">Jour</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={dayOfMonth}
                  onChange={(e) => setDayOfMonth(+e.target.value)}
                  className="w-full border border-theme-border bg-theme-surface text-theme-text rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-text mb-1">Mois</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(+e.target.value)}
                  className="w-full border border-theme-border bg-theme-surface text-theme-text rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {MONTHS_FR.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-theme-border rounded-lg text-sm text-theme-text hover:bg-theme-bg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className={`flex-1 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors ${
                direction === 'out' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              {saving ? '…' : isEdit ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
