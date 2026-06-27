'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import type { SavingsGoal } from '@budgio/types';

interface Props {
  token: string;
  householdId: string;
  initialData?: SavingsGoal;
  onClose: () => void;
  onSaved: (goal: SavingsGoal) => void;
}

export function AddGoalModal({ token, householdId, initialData, onClose, onSaved }: Props) {
  const isEdit = !!initialData;
  const [name, setName] = useState(initialData?.name ?? '');
  const [targetAmount, setTargetAmount] = useState(initialData ? String(initialData.targetAmount) : '');
  const [deadline, setDeadline] = useState(
    initialData?.deadline ? initialData.deadline.slice(0, 10) : '',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !targetAmount) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        name,
        targetAmount: parseFloat(targetAmount),
        ...(deadline ? { deadline } : {}),
      };
      let goal: unknown;
      if (isEdit) {
        goal = await api.updateGoal(token, householdId, initialData.id, payload);
      } else {
        goal = await api.createGoal(token, householdId, payload);
      }
      onSaved(goal as SavingsGoal);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-theme-surface rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-theme-border">
          <h2 className="text-base font-semibold text-theme-text">
            {isEdit ? "Modifier l'objectif" : 'Nouvel objectif'}
          </h2>
          <button onClick={onClose} className="text-theme-muted hover:text-theme-text text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">Nom de l'objectif</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex. Vacances Italie, Voiture…"
              required
              className="w-full px-3 py-2 text-sm border border-theme-border rounded-lg bg-theme-bg text-theme-text placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">Montant cible (€)</label>
            <input
              type="number"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              placeholder="2000"
              min="1"
              step="0.01"
              required
              className="w-full px-3 py-2 text-sm border border-theme-border rounded-lg bg-theme-bg text-theme-text placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Échéance <span className="text-theme-muted font-normal">(optionnelle)</span>
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-theme-border rounded-lg bg-theme-bg text-theme-text focus:outline-none focus:ring-2 focus:ring-brand-500"
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
              {saving ? 'Enregistrement…' : isEdit ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
