'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import type { Category, Transaction } from '@budgio/types';

interface Props {
  token: string;
  householdId: string;
  year: number;
  month: number;
  categories: Category[];
  transaction?: Transaction;
  onClose: () => void;
  onSaved: (tx: unknown) => void;
}

type Direction = 'in' | 'out';

export function AddTransactionModal({ token, householdId, year, month, categories, transaction, onClose, onSaved }: Props) {
  const isEdit = !!transaction;
  const defaultDate = transaction
    ? transaction.date.slice(0, 10)
    : `${year}-${String(month).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;

  const [direction, setDirection] = useState<Direction>(
    !transaction || transaction.amount >= 0 ? 'in' : 'out',
  );
  const [label, setLabel] = useState(transaction?.label ?? '');
  const [amount, setAmount] = useState(transaction ? String(Math.abs(transaction.amount)) : '');
  const [categoryId, setCategoryId] = useState(transaction?.category?.id ?? '');
  const [date, setDate] = useState(defaultDate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label || !amount || !date) return;
    setSaving(true);
    setError('');
    try {
      const signedAmount = direction === 'out' ? -Math.abs(parseFloat(amount)) : Math.abs(parseFloat(amount));
      const payload = {
        label,
        amount: signedAmount,
        ...(categoryId ? { categoryId } : { categoryId: null }),
        date: new Date(date).toISOString(),
      };
      const tx = isEdit
        ? await api.updateTransaction(token, householdId, transaction!.id, payload)
        : await api.createTransaction(token, householdId, payload);
      onSaved(tx);
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
            {isEdit ? 'Modifier la transaction' : 'Nouvelle transaction'}
          </h2>
          <button onClick={onClose} className="text-theme-muted hover:text-theme-text text-xl">✕</button>
        </div>

        {/* Direction toggle */}
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
              placeholder={direction === 'out' ? 'Ex: Courses Carrefour' : 'Ex: Salaire'}
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
              <label className="block text-sm font-medium text-theme-text mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-theme-border bg-theme-surface text-theme-text rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text mb-1">
              Catégorie <span className="text-theme-muted font-normal">(optionnel)</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border border-theme-border bg-theme-surface text-theme-text rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">— Aucune —</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>

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
              {saving ? '…' : isEdit ? 'Enregistrer' : direction === 'out' ? 'Ajouter la sortie' : "Ajouter l'entrée"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
