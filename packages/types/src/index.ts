export type HouseholdRole = 'ADMIN' | 'MEMBER';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  theme: string;
  createdAt: string;
}

export interface Category {
  id: string;
  label: string;
  color: string;
}

export interface HouseholdMember {
  id: string;
  role: HouseholdRole;
  user: Pick<User, 'id' | 'email' | 'name' | 'avatarUrl'>;
}

export interface Household {
  id: string;
  name: string;
  isActive: boolean;
  members: HouseholdMember[];
  createdAt: string;
}

export interface Transaction {
  id: string;
  label: string;
  amount: number;
  category: Category | null;
  date: string;
  attachmentUrl: string | null;
  isRecurring: boolean;
  recurringCron: string | null;
  createdBy: Pick<User, 'id' | 'name'>;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardCategory {
  id: string;
  label: string;
  color: string;
  total: number;
}

export interface Dashboard {
  openingBalance: number;
  totalIn: number;
  totalOut: number;
  closingBalance: number;
  byCategory: DashboardCategory[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export type FrequencyType = 'DAILY' | 'WEEKDAYS' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface HouseholdLog {
  id: string;
  event: string;
  meta: Record<string, unknown> | null;
  createdAt: string;
  user: Pick<User, 'id' | 'name' | 'avatarUrl'> | null;
}

export interface MonthStat {
  year: number;
  month: number;
  totalIn: number;
  totalOut: number;
  closingBalance: number;
}

export interface CategoryStat {
  id: string;
  label: string;
  color: string;
  total: number;
}

export interface StatsTrend {
  incomeChange: number;
  expenseChange: number;
}

export interface StatsPeak {
  year: number;
  month: number;
  amount: number;
}

export interface StatsTransaction {
  label: string;
  amount: number;
  date: string;
}

export interface HouseholdStats {
  months: MonthStat[];
  currentBalance: number;
  avgMonthlyIn: number;
  avgMonthlyOut: number;
  savingsRate: number;
  transactionCount: number;
  trend: StatsTrend;
  bestSavingsMonth: StatsPeak | null;
  worstMonth: StatsPeak | null;
  biggestExpense: StatsTransaction | null;
  biggestIncome: StatsTransaction | null;
  topExpenseCategories: CategoryStat[];
  topIncomeCategories: CategoryStat[];
}

export interface RecurringTransaction {
  id: string;
  label: string;
  amount: number;
  frequency: FrequencyType;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  month: number | null;
  isActive: boolean;
  lastRunDate: string | null;
  category: Category | null;
  createdBy: Pick<User, 'id' | 'name'>;
  createdAt: string;
}
