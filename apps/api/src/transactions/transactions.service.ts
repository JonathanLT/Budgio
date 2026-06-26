import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HouseholdsService } from '../households/households.service';
import { LogService } from '../log/log.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

const INCLUDE = {
  createdBy: { select: { id: true, name: true, avatarUrl: true } },
  category: { select: { id: true, label: true, color: true } },
};

@Injectable()
export class TransactionsService {
  constructor(
    private prisma: PrismaService,
    private households: HouseholdsService,
    private log: LogService,
  ) {}

  async findAll(householdId: string, userId: string, year?: number, month?: number) {
    await this.households.assertMember(householdId, userId);

    const where: Record<string, unknown> = { householdId };
    if (year && month) {
      where['date'] = {
        gte: new Date(year, month - 1, 1),
        lte: new Date(year, month, 0, 23, 59, 59),
      };
    }

    return this.prisma.transaction.findMany({
      where,
      include: INCLUDE,
      orderBy: { date: 'desc' },
    });
  }

  async dashboard(householdId: string, userId: string, year: number, month: number) {
    await this.households.assertMember(householdId, userId);

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59);

    const [previousAggregate, transactions] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { householdId, date: { lt: monthStart } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.findMany({
        where: { householdId, date: { gte: monthStart, lte: monthEnd } },
        select: { amount: true, categoryId: true, category: { select: { label: true, color: true } } },
      }),
    ]);

    const openingBalance = previousAggregate._sum.amount ?? 0;
    const totalIn = transactions.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const totalOut = transactions.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
    const closingBalance = openingBalance + totalIn + totalOut;

    const byCategory = transactions
      .filter((t) => t.category)
      .reduce<Record<string, { label: string; color: string; total: number }>>((acc, t) => {
        const key = t.categoryId!;
        if (!acc[key]) acc[key] = { label: t.category!.label, color: t.category!.color, total: 0 };
        acc[key].total += t.amount;
        return acc;
      }, {});

    return {
      openingBalance,
      totalIn,
      totalOut,
      closingBalance,
      byCategory: Object.entries(byCategory).map(([id, v]) => ({ id, ...v })),
    };
  }

  async stats(householdId: string, userId: string) {
    await this.households.assertMember(householdId, userId);

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [openingAgg, txs] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { householdId, date: { lt: startDate } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.findMany({
        where: { householdId, date: { gte: startDate, lte: endDate } },
        select: {
          amount: true,
          date: true,
          label: true,
          categoryId: true,
          category: { select: { id: true, label: true, color: true } },
        },
        orderBy: { date: 'asc' },
      }),
    ]);

    let runningBalance = openingAgg._sum.amount ?? 0;
    const months = [];

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const mStart = new Date(year, month - 1, 1);
      const mEnd = new Date(year, month, 0, 23, 59, 59, 999);

      const monthTxs = txs.filter((t) => t.date >= mStart && t.date <= mEnd);
      const totalIn = monthTxs.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
      const totalOut = monthTxs.filter((t) => t.amount < 0).reduce((s, t) => s + t.amount, 0);
      runningBalance += totalIn + totalOut;

      months.push({ year, month, totalIn, totalOut, closingBalance: runningBalance });
    }

    // Category aggregation over the full 12-month window
    const catMap = new Map<string, { id: string; label: string; color: string; total: number }>();
    for (const tx of txs) {
      if (!tx.category || !tx.categoryId) continue;
      if (!catMap.has(tx.categoryId)) catMap.set(tx.categoryId, { ...tx.category, total: 0 });
      catMap.get(tx.categoryId)!.total += tx.amount;
    }
    const categories = Array.from(catMap.values());

    const activeMths = months.filter((m) => m.totalIn > 0 || m.totalOut < 0);
    const n = activeMths.length || 1;
    const avgMonthlyIn = activeMths.reduce((s, m) => s + m.totalIn, 0) / n;
    const avgMonthlyOut = activeMths.reduce((s, m) => s + m.totalOut, 0) / n;

    const totalIn12 = months.reduce((s, m) => s + m.totalIn, 0);
    const totalOut12 = months.reduce((s, m) => s + Math.abs(m.totalOut), 0);
    const savingsRate = totalIn12 > 0 ? Math.round(((totalIn12 - totalOut12) / totalIn12) * 100) : 0;

    // Trend: last 3 months vs previous 3 months
    const last3 = months.slice(-3);
    const prev3 = months.slice(-6, -3);
    const last3AvgOut = last3.reduce((s, m) => s + Math.abs(m.totalOut), 0) / 3;
    const prev3AvgOut = prev3.reduce((s, m) => s + Math.abs(m.totalOut), 0) / 3;
    const expenseChange = prev3AvgOut > 0 ? Math.round(((last3AvgOut - prev3AvgOut) / prev3AvgOut) * 100) : 0;
    const last3AvgIn = last3.reduce((s, m) => s + m.totalIn, 0) / 3;
    const prev3AvgIn = prev3.reduce((s, m) => s + m.totalIn, 0) / 3;
    const incomeChange = prev3AvgIn > 0 ? Math.round(((last3AvgIn - prev3AvgIn) / prev3AvgIn) * 100) : 0;

    // Best / worst months
    const byNet = [...months].sort((a, b) => (b.totalIn + b.totalOut) - (a.totalIn + a.totalOut));
    const bestSavingsMonth = byNet[0] && (byNet[0].totalIn + byNet[0].totalOut) > 0
      ? { year: byNet[0].year, month: byNet[0].month, amount: byNet[0].totalIn + byNet[0].totalOut }
      : null;

    const byOut = [...months].sort((a, b) => a.totalOut - b.totalOut);
    const worstMonth = byOut[0] && byOut[0].totalOut < 0
      ? { year: byOut[0].year, month: byOut[0].month, amount: byOut[0].totalOut }
      : null;

    // Biggest single transactions
    const sorted = [...txs].sort((a, b) => a.amount - b.amount);
    const biggestExpenseTx = sorted[0]?.amount < 0 ? sorted[0] : null;
    const biggestIncomeTx = sorted[sorted.length - 1]?.amount > 0 ? sorted[sorted.length - 1] : null;
    const biggestExpense = biggestExpenseTx
      ? { label: biggestExpenseTx.label, amount: biggestExpenseTx.amount, date: biggestExpenseTx.date.toISOString() }
      : null;
    const biggestIncome = biggestIncomeTx
      ? { label: biggestIncomeTx.label, amount: biggestIncomeTx.amount, date: biggestIncomeTx.date.toISOString() }
      : null;

    return {
      months,
      currentBalance: months[months.length - 1]?.closingBalance ?? 0,
      avgMonthlyIn,
      avgMonthlyOut,
      savingsRate,
      transactionCount: txs.length,
      trend: { incomeChange, expenseChange },
      bestSavingsMonth,
      worstMonth,
      biggestExpense,
      biggestIncome,
      topExpenseCategories: categories.filter((c) => c.total < 0).sort((a, b) => a.total - b.total).slice(0, 5),
      topIncomeCategories: categories.filter((c) => c.total > 0).sort((a, b) => b.total - a.total).slice(0, 3),
    };
  }

  async create(householdId: string, userId: string, dto: CreateTransactionDto) {
    await this.households.assertMember(householdId, userId);
    const { categoryId, ...rest } = dto;
    const isRecurring = rest.isRecurring ?? !!rest.recurringCron;
    const tx = await this.prisma.transaction.create({
      data: {
        ...rest,
        ...(categoryId ? { categoryId } : {}),
        date: new Date(dto.date),
        isRecurring,
        householdId,
        createdById: userId,
      },
      include: INCLUDE,
    });
    void this.log.log(householdId, userId, 'TRANSACTION_CREATED', { label: dto.label, amount: dto.amount });
    return tx;
  }

  async update(householdId: string, txId: string, userId: string, dto: UpdateTransactionDto) {
    await this.assertOwnerOrAdmin(householdId, txId, userId);
    const { categoryId, ...rest } = dto;
    const tx = await this.prisma.transaction.update({
      where: { id: txId },
      data: {
        ...rest,
        ...(categoryId !== undefined ? { categoryId: categoryId ?? null } : {}),
        date: dto.date ? new Date(dto.date) : undefined,
      },
      include: INCLUDE,
    });
    void this.log.log(householdId, userId, 'TRANSACTION_UPDATED', { label: tx.label });
    return tx;
  }

  async remove(householdId: string, txId: string, userId: string) {
    await this.assertOwnerOrAdmin(householdId, txId, userId);
    await this.prisma.transaction.delete({ where: { id: txId } });
    void this.log.log(householdId, userId, 'TRANSACTION_DELETED');
  }

  private async assertOwnerOrAdmin(householdId: string, txId: string, userId: string) {
    const member = await this.households.assertMember(householdId, userId);
    const tx = await this.prisma.transaction.findUniqueOrThrow({ where: { id: txId } });
    if (tx.createdById !== userId && member.role !== 'ADMIN') {
      throw new ForbiddenException('Seul le créateur ou un admin peut modifier cette transaction');
    }
  }
}
