const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

function jwtExpiresAt(token: string): number {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return (payload.exp as number) * 1000;
  } catch {
    return 0;
  }
}

function isExpiredOrSoon(token: string): boolean {
  return jwtExpiresAt(token) < Date.now() + 60_000;
}

let refreshPromise: Promise<string> | null = null;

async function doRefresh(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem('budgio_refresh');
    if (!refreshToken) throw new Error('Non authentifié');

    const res = await fetch(`${BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      localStorage.removeItem('budgio_access');
      localStorage.removeItem('budgio_refresh');
      window.location.replace('/login');
      throw new Error('Session expirée');
    }

    const tokens = await res.json() as { accessToken: string; refreshToken: string };
    localStorage.setItem('budgio_access', tokens.accessToken);
    localStorage.setItem('budgio_refresh', tokens.refreshToken);
    return tokens.accessToken;
  })().finally(() => { refreshPromise = null; });

  return refreshPromise;
}

async function apiFetch<T>(path: string, token: string, options?: RequestInit): Promise<T> {
  let activeToken = token;
  if (isExpiredOrSoon(activeToken)) activeToken = await doRefresh();

  const res = await fetch(`${BASE}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${activeToken}`,
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    const retryToken = await doRefresh();
    const retry = await fetch(`${BASE}/api${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${retryToken}`,
        ...options?.headers,
      },
    });
    if (!retry.ok) {
      const err = await retry.json().catch(() => ({ message: retry.statusText }));
      throw new Error(err.message ?? 'Erreur API');
    }
    if (retry.status === 204) return undefined as T;
    return retry.json();
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? 'Erreur API');
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  me: (token: string) => apiFetch('/users/me', token),
  updateProfile: (token: string, data: { theme: string }) =>
    apiFetch('/users/me', token, { method: 'PATCH', body: JSON.stringify(data) }),
  myHouseholds: (token: string) => apiFetch('/users/me/households', token),

  // Households
  createHousehold: (token: string, name: string) =>
    apiFetch('/households', token, { method: 'POST', body: JSON.stringify({ name }) }),
  getHousehold: (token: string, id: string) => apiFetch(`/households/${id}`, token),
  updateHousehold: (token: string, id: string, name: string) =>
    apiFetch(`/households/${id}`, token, { method: 'PATCH', body: JSON.stringify({ name }) }),
  deactivateHousehold: (token: string, id: string) =>
    apiFetch(`/households/${id}/deactivate`, token, { method: 'PATCH' }),

  // Members
  getMemberSuggestions: (token: string, id: string) =>
    apiFetch(`/households/${id}/members/suggestions`, token),
  inviteMember: (token: string, id: string, email: string) =>
    apiFetch(`/households/${id}/members`, token, { method: 'POST', body: JSON.stringify({ email }) }),
  updateMemberRole: (token: string, id: string, memberId: string, role: string) =>
    apiFetch(`/households/${id}/members/${memberId}`, token, { method: 'PATCH', body: JSON.stringify({ role }) }),
  removeMember: (token: string, id: string, memberId: string) =>
    apiFetch(`/households/${id}/members/${memberId}`, token, { method: 'DELETE' }),

  // Categories
  getCategories: (token: string, householdId: string) =>
    apiFetch(`/households/${householdId}/categories`, token),
  createCategory: (token: string, householdId: string, data: { label: string; color: string }) =>
    apiFetch(`/households/${householdId}/categories`, token, { method: 'POST', body: JSON.stringify(data) }),
  updateCategory: (token: string, householdId: string, categoryId: string, data: { label?: string; color?: string }) =>
    apiFetch(`/households/${householdId}/categories/${categoryId}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCategory: (token: string, householdId: string, categoryId: string) =>
    apiFetch(`/households/${householdId}/categories/${categoryId}`, token, { method: 'DELETE' }),
  reorderCategories: (token: string, householdId: string, items: { id: string; order: number }[]) =>
    apiFetch(`/households/${householdId}/categories/reorder`, token, { method: 'PUT', body: JSON.stringify({ items }) }),

  // Transactions
  getTransactions: (token: string, householdId: string, year?: number, month?: number) => {
    const params = year && month ? `?year=${year}&month=${month}` : '';
    return apiFetch(`/households/${householdId}/transactions${params}`, token);
  },
  getDashboard: (token: string, householdId: string, year: number, month: number) =>
    apiFetch(`/households/${householdId}/transactions/dashboard?year=${year}&month=${month}`, token),
  createTransaction: (token: string, householdId: string, data: unknown) =>
    apiFetch(`/households/${householdId}/transactions`, token, { method: 'POST', body: JSON.stringify(data) }),
  updateTransaction: (token: string, householdId: string, txId: string, data: unknown) =>
    apiFetch(`/households/${householdId}/transactions/${txId}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteTransaction: (token: string, householdId: string, txId: string) =>
    apiFetch(`/households/${householdId}/transactions/${txId}`, token, { method: 'DELETE' }),

  // Statistics
  getStats: (token: string, householdId: string) =>
    apiFetch(`/households/${householdId}/transactions/stats`, token),

  // Household history (admin only)
  getHouseholdHistory: (token: string, householdId: string) =>
    apiFetch(`/households/${householdId}/history`, token),

  // Recurring transactions
  getRecurring: (token: string, householdId: string) =>
    apiFetch(`/households/${householdId}/recurring`, token),
  createRecurring: (token: string, householdId: string, data: unknown) =>
    apiFetch(`/households/${householdId}/recurring`, token, { method: 'POST', body: JSON.stringify(data) }),
  updateRecurring: (token: string, householdId: string, id: string, data: unknown) =>
    apiFetch(`/households/${householdId}/recurring/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteRecurring: (token: string, householdId: string, id: string) =>
    apiFetch(`/households/${householdId}/recurring/${id}`, token, { method: 'DELETE' }),
  replayRecurringMonth: (token: string, householdId: string) =>
    apiFetch(`/households/${householdId}/recurring/replay-month`, token, { method: 'POST' }),
  reorderRecurring: (token: string, householdId: string, items: { id: string; order: number }[]) =>
    apiFetch(`/households/${householdId}/recurring/reorder`, token, { method: 'PUT', body: JSON.stringify({ items }) }),

  // Savings goals
  getGoals: (token: string, householdId: string) =>
    apiFetch(`/households/${householdId}/goals`, token),
  createGoal: (token: string, householdId: string, data: { name: string; targetAmount: number; deadline?: string }) =>
    apiFetch(`/households/${householdId}/goals`, token, { method: 'POST', body: JSON.stringify(data) }),
  updateGoal: (token: string, householdId: string, goalId: string, data: { name?: string; targetAmount?: number; deadline?: string | null; isCompleted?: boolean }) =>
    apiFetch(`/households/${householdId}/goals/${goalId}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteGoal: (token: string, householdId: string, goalId: string) =>
    apiFetch(`/households/${householdId}/goals/${goalId}`, token, { method: 'DELETE' }),
  reorderGoals: (token: string, householdId: string, items: { id: string; order: number }[]) =>
    apiFetch(`/households/${householdId}/goals/reorder`, token, { method: 'PUT', body: JSON.stringify({ items }) }),
  contributeGoal: (token: string, householdId: string, goalId: string, data: { amount: number; note?: string }) =>
    apiFetch(`/households/${householdId}/goals/${goalId}/contribute`, token, { method: 'POST', body: JSON.stringify(data) }),
};
