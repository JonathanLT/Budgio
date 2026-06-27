'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { SavingsGoal } from '@budgio/types';

interface Props {
  token: string;
  householdId: string;
  goal: SavingsGoal;
  onClose: () => void;
  onSaved: (goal: SavingsGoal) => void;
}

export function ContributeModal({ token, householdId, goal, onClose, onSaved }: Props) {
  const remaining = goal.targetAmount - goal.savedAmount;
  const [amount, setAmount] = useState(
    goal.monthlyRecommended ? String(goal.monthlyRecommended) : '',
  );
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount) return;
    setSaving(true);
    setError('');
    try {
      const updated = await api.contributeGoal(token, householdId, goal.id, {
        amount: parseFloat(amount),
        ...(note ? { note } : {}),
      });
      onSaved(updated as SavingsGoal);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-theme-surface rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border">
          <h2 className="text-base font-semibold text-theme-text">Ajouter une contribution</h2>
          <button onClick={onClose} className="text-theme-muted hover:text-theme-text text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <p className="text-sm text-theme-muted">
            Objectif : <span className="font-medium text-theme-text">{goal.name}</span>
            {' — '}reste <span className="font-semibold text-brand-600">{formatCurrency(remaining)}</span>
          </p>

          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">Montant (€)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="250"
              min="0.01"
              step="0.01"
              required
              className="w-full px-3 py-2 text-sm border border-theme-border rounded-lg bg-theme-bg text-theme-text placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Note <span className="text-theme-muted font-normal">(optionnelle)</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="ex. Virement épargne janvier"
              className="w-full px-3 py-2 text-sm border border-theme-border rounded-lg bg-theme-bg text-theme-text placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm border border-theme-border text-theme-text rounded-lg hover:bg-theme-bg transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors font-medium"
            >
              {saving ? 'Enregistrement…' : 'Confirmer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
