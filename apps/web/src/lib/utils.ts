export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(
    new Date(dateStr),
  );
}

export const CATEGORY_LABELS: Record<string, string> = {
  ALIMENTATION: 'Alimentation',
  LOGEMENT: 'Logement',
  TRANSPORT: 'Transport',
  SANTE: 'Santé',
  LOISIRS: 'Loisirs',
  EDUCATION: 'Éducation',
  ABONNEMENTS: 'Abonnements',
  AUTRES: 'Autres',
};

export const CATEGORY_COLORS: Record<string, string> = {
  ALIMENTATION: 'bg-orange-100 text-orange-800',
  LOGEMENT: 'bg-blue-100 text-blue-800',
  TRANSPORT: 'bg-purple-100 text-purple-800',
  SANTE: 'bg-red-100 text-red-800',
  LOISIRS: 'bg-pink-100 text-pink-800',
  EDUCATION: 'bg-indigo-100 text-indigo-800',
  ABONNEMENTS: 'bg-yellow-100 text-yellow-800',
  AUTRES: 'bg-gray-100 text-gray-800',
};

export const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
