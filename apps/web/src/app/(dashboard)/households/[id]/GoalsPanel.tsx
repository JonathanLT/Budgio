'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { AddGoalModal } from './AddGoalModal';
import { ContributeModal } from './ContributeModal';
import type { SavingsGoal } from '@budgio/types';

interface Props {
  householdId: string;
  token: string;
}

function ProgressBar({ percent, completed }: { percent: number; completed: boolean }) {
  const clamped = Math.min(100, percent);
  const color = completed
    ? 'bg-green-500'
    : clamped >= 100
    ? 'bg-green-500'
    : clamped >= 75
    ? 'bg-brand-500'
    : clamped >= 40
    ? 'bg-blue-400'
    : 'bg-theme-muted';

  return (
    <div className="w-full h-2 bg-theme-bg rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function formatDeadline(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const months =
    (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());
  if (months <= 0) return 'Échéance dépassée';
  if (months === 1) return 'dans 1 mois';
  return `dans ${months} mois`;
}

export function GoalsPanel({ householdId, token }: Props) {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [contributingGoal, setContributingGoal] = useState<SavingsGoal | null>(null);

  useEffect(() => {
    setLoading(true);
    api
      .getGoals(token, householdId)
      .then((data) => setGoals(data as SavingsGoal[]))
      .finally(() => setLoading(false));
  }, [token, householdId]);

  async function handleDelete(id: string) {
    await api.deleteGoal(token, householdId, id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  async function handleToggleComplete(goal: SavingsGoal) {
    const updated = await api.updateGoal(token, householdId, goal.id, {
      isCompleted: !goal.isCompleted,
    });
    setGoals((prev) => prev.map((g) => (g.id === goal.id ? (updated as SavingsGoal) : g)));
  }

  const active = goals.filter((g) => !g.isCompleted);
  const completed = goals.filter((g) => g.isCompleted);

  if (loading) {
    return <div className="text-center py-10 text-theme-muted">Chargement…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-theme-muted">
          {active.length === 0
            ? 'Aucun objectif en cours.'
            : `${active.length} objectif${active.length > 1 ? 's' : ''} en cours`}
        </p>
        <button
          onClick={() => setShowAdd(true)}
          className="text-sm px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
        >
          + Objectif
        </button>
      </div>

      {active.length === 0 && completed.length === 0 && (
        <div className="text-center py-16 text-theme-muted">
          <p className="text-3xl mb-3">🎯</p>
          <p className="text-sm">
            Définissez un objectif d'épargne pour suivre votre progression mois par mois.
          </p>
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-4">
          {active.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={() => setEditingGoal(goal)}
              onDelete={() => handleDelete(goal.id)}
              onContribute={() => setContributingGoal(goal)}
              onToggleComplete={() => handleToggleComplete(goal)}
            />
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-theme-muted">Atteints</h3>
          {completed.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={() => setEditingGoal(goal)}
              onDelete={() => handleDelete(goal.id)}
              onContribute={() => setContributingGoal(goal)}
              onToggleComplete={() => handleToggleComplete(goal)}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddGoalModal
          token={token}
          householdId={householdId}
          onClose={() => setShowAdd(false)}
          onSaved={(goal) => {
            setGoals((prev) => [...prev, goal]);
            setShowAdd(false);
          }}
        />
      )}

      {editingGoal && (
        <AddGoalModal
          token={token}
          householdId={householdId}
          initialData={editingGoal}
          onClose={() => setEditingGoal(null)}
          onSaved={(goal) => {
            setGoals((prev) => prev.map((g) => (g.id === goal.id ? goal : g)));
            setEditingGoal(null);
          }}
        />
      )}

      {contributingGoal && (
        <ContributeModal
          token={token}
          householdId={householdId}
          goal={contributingGoal}
          onClose={() => setContributingGoal(null)}
          onSaved={(goal) => {
            setGoals((prev) => prev.map((g) => (g.id === goal.id ? goal : g)));
            setContributingGoal(null);
          }}
        />
      )}
    </div>
  );
}

function GoalCard({
  goal,
  onEdit,
  onDelete,
  onContribute,
  onToggleComplete,
}: {
  goal: SavingsGoal;
  onEdit: () => void;
  onDelete: () => void;
  onContribute: () => void;
  onToggleComplete: () => void;
}) {
  const remaining = goal.targetAmount - goal.savedAmount;

  return (
    <div className={`bg-theme-surface rounded-xl border border-theme-border p-5 group transition-opacity ${goal.isCompleted ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          {goal.isCompleted && <span className="text-green-500 text-lg">✓</span>}
          <h3 className={`font-semibold text-theme-text ${goal.isCompleted ? 'line-through text-theme-muted' : ''}`}>
            {goal.name}
          </h3>
          {goal.deadline && !goal.isCompleted && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-theme-bg text-theme-muted font-medium">
              {formatDeadline(goal.deadline)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {!goal.isCompleted && (
            <button
              onClick={onContribute}
              className="text-xs px-2.5 py-1 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors font-medium"
            >
              + Contribuer
            </button>
          )}
          <button onClick={onEdit} className="text-theme-muted hover:text-brand-500 transition-colors text-sm" title="Modifier">✏️</button>
          <button onClick={onToggleComplete} className="text-theme-muted hover:text-green-500 transition-colors text-sm" title={goal.isCompleted ? 'Rouvrir' : 'Marquer atteint'}>
            {goal.isCompleted ? '↩' : '✓'}
          </button>
          <button onClick={onDelete} className="text-theme-muted hover:text-red-500 transition-colors" title="Supprimer">✕</button>
        </div>
      </div>

      <div className="space-y-2">
        <ProgressBar percent={goal.percent} completed={goal.isCompleted} />
        <div className="flex items-center justify-between text-sm">
          <span className="text-theme-muted">
            <span className="font-semibold text-theme-text">{formatCurrency(goal.savedAmount)}</span>
            {' / '}{formatCurrency(goal.targetAmount)}
          </span>
          <div className="flex items-center gap-3">
            {goal.monthlyRecommended && !goal.isCompleted && (
              <span className="text-xs text-theme-muted">
                → <span className="font-medium text-brand-600">{formatCurrency(goal.monthlyRecommended)}/mois</span> conseillé
              </span>
            )}
            <span className={`font-semibold text-sm ${goal.percent >= 100 ? 'text-green-500' : 'text-theme-muted'}`}>
              {goal.percent}%
            </span>
          </div>
        </div>
        {!goal.isCompleted && remaining > 0 && (
          <p className="text-xs text-theme-muted">
            Il reste <span className="font-medium text-theme-text">{formatCurrency(remaining)}</span> à épargner
          </p>
        )}
      </div>

      {goal.contributions.length > 0 && (
        <details className="mt-3">
          <summary className="text-xs text-theme-muted cursor-pointer hover:text-theme-text">
            {goal.contributions.length} contribution{goal.contributions.length > 1 ? 's' : ''}
          </summary>
          <div className="mt-2 space-y-1 pl-2 border-l-2 border-theme-border">
            {goal.contributions.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center justify-between text-xs text-theme-muted">
                <span>{c.note ?? new Date(c.date).toLocaleDateString('fr-FR')}</span>
                <span className="font-medium text-green-600">+{formatCurrency(c.amount)}</span>
              </div>
            ))}
            {goal.contributions.length > 5 && (
              <p className="text-xs text-theme-muted">+ {goal.contributions.length - 5} autres…</p>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
