import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { HouseholdsService } from '../households/households.service';
import { LogService } from '../log/log.service';
import { CreateRecurringDto } from './dto/create-recurring.dto';
import { UpdateRecurringDto } from './dto/update-recurring.dto';
import { ReorderRecurringDto } from './dto/reorder-recurring.dto';
import type { RecurringTransaction } from '@prisma/client';

const INCLUDE = {
  category: { select: { id: true, label: true, color: true } },
  createdBy: { select: { id: true, name: true } },
};

@Injectable()
export class RecurringService {
  private readonly logger = new Logger(RecurringService.name);

  constructor(
    private prisma: PrismaService,
    private households: HouseholdsService,
    private log: LogService,
  ) {}

  async findAll(householdId: string, userId: string) {
    await this.households.assertMember(householdId, userId);
    return this.prisma.recurringTransaction.findMany({
      where: { householdId, isActive: true },
      include: INCLUDE,
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async reorder(householdId: string, userId: string, dto: ReorderRecurringDto) {
    await this.households.assertMember(householdId, userId);
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.recurringTransaction.updateMany({
          where: { id: item.id, householdId },
          data: { order: item.order },
        }),
      ),
    );
    return this.findAll(householdId, userId);
  }

  async create(householdId: string, userId: string, dto: CreateRecurringDto) {
    await this.households.assertMember(householdId, userId);
    const { categoryId, ...rest } = dto;
    const rt = await this.prisma.recurringTransaction.create({
      data: {
        ...rest,
        ...(categoryId ? { categoryId } : {}),
        householdId,
        createdById: userId,
      },
      include: INCLUDE,
    });
    void this.log.log(householdId, userId, 'RECURRING_CREATED', { label: dto.label, amount: dto.amount, frequency: dto.frequency });
    return rt;
  }

  async update(householdId: string, id: string, userId: string, dto: UpdateRecurringDto) {
    await this.households.assertMember(householdId, userId);
    const { categoryId, ...rest } = dto;
    const rt = await this.prisma.recurringTransaction.update({
      where: { id, householdId },
      data: {
        ...rest,
        ...(categoryId !== undefined ? { categoryId: categoryId ?? null } : {}),
      },
      include: INCLUDE,
    });
    void this.log.log(householdId, userId, 'RECURRING_UPDATED', { label: rt.label });
    return rt;
  }

  async remove(householdId: string, id: string, userId: string) {
    await this.households.assertMember(householdId, userId);
    await this.prisma.recurringTransaction.update({
      where: { id, householdId },
      data: { isActive: false },
    });
    void this.log.log(householdId, userId, 'RECURRING_DELETED');
  }

  // ─── Replay du mois en cours ──────────────────────────────────────────────

  async replayMonth(householdId: string, userId: string) {
    await this.households.assertMember(householdId, userId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd   = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

    const actives = await this.prisma.recurringTransaction.findMany({
      where: { householdId, isActive: true },
    });

    let created = 0;

    for (const rt of actives) {
      const dueDays = this.getDueDaysInRange(rt, monthStart, today);
      if (dueDays.length === 0) continue;

      // Transactions déjà générées ce mois pour ce mouvement fixe
      const existing = await this.prisma.transaction.findMany({
        where: { recurringId: rt.id, date: { gte: monthStart, lte: monthEnd } },
        select: { date: true },
      });
      const coveredDates = existing.map((e) => e.date);

      for (const day of dueDays) {
        if (this.periodAlreadyCovered(rt.frequency, day, coveredDates)) continue;

        await this.prisma.transaction.create({
          data: {
            label: rt.label,
            amount: rt.amount,
            categoryId: rt.categoryId ?? undefined,
            date: day,
            isRecurring: true,
            recurringId: rt.id,
            householdId: rt.householdId,
            createdById: rt.createdById,
          },
        });

        // Mise à jour en mémoire pour éviter les doublons dans la même boucle
        coveredDates.push(day);
        created++;
      }

      // Mettre à jour lastRunDate au dernier jour traité
      const lastDay = dueDays[dueDays.length - 1];
      if (!rt.lastRunDate || rt.lastRunDate < lastDay) {
        await this.prisma.recurringTransaction.update({
          where: { id: rt.id },
          data: { lastRunDate: lastDay },
        });
      }
    }

    return { created };
  }

  // ─── Scheduler quotidien ──────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async generateDueTransactions() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const actives = await this.prisma.recurringTransaction.findMany({
      where: { isActive: true },
    });

    let generated = 0;
    for (const rt of actives) {
      if (this.isDue(rt, today)) {
        await this.prisma.$transaction([
          this.prisma.transaction.create({
            data: {
              label: rt.label,
              amount: rt.amount,
              categoryId: rt.categoryId ?? undefined,
              date: today,
              isRecurring: true,
              recurringId: rt.id,
              householdId: rt.householdId,
              createdById: rt.createdById,
            },
          }),
          this.prisma.recurringTransaction.update({
            where: { id: rt.id },
            data: { lastRunDate: today },
          }),
        ]);
        generated++;
      }
    }

    if (generated > 0) {
      this.logger.log(`Mouvements fixes : ${generated} transaction(s) générée(s)`);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /** Retourne tous les jours [from, to] où ce mouvement fixe aurait dû se déclencher. */
  private getDueDaysInRange(rt: RecurringTransaction, from: Date, to: Date): Date[] {
    const days: Date[] = [];
    const cursor = new Date(from);
    while (cursor <= to) {
      if (this.shouldFireOnDay(rt, cursor)) {
        days.push(new Date(cursor));
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  }

  /** Vérifie si le mouvement fixe se déclenche un jour donné. */
  private shouldFireOnDay(rt: RecurringTransaction, day: Date): boolean {
    const dow = day.getDay();
    switch (rt.frequency) {
      case 'DAILY':    return true;
      case 'WEEKDAYS': return dow >= 1 && dow <= 5;
      case 'WEEKLY':   return dow === (rt.dayOfWeek ?? 1);
      case 'MONTHLY':  return day.getDate() === (rt.dayOfMonth ?? 1);
      case 'YEARLY':
        return (
          day.getDate() === (rt.dayOfMonth ?? 1) &&
          day.getMonth() + 1 === (rt.month ?? 1)
        );
      default: return false;
    }
  }

  /** Vérifie si la période correspondante est déjà couverte par une transaction existante. */
  private periodAlreadyCovered(
    frequency: string,
    day: Date,
    existingDates: Date[],
  ): boolean {
    return existingDates.some((existing) => {
      switch (frequency) {
        case 'DAILY':
        case 'WEEKDAYS':
          return this.sameDay(existing, day);
        case 'WEEKLY':
          return this.sameWeek(existing, day);
        case 'MONTHLY':
          return this.sameMonth(existing, day);
        case 'YEARLY':
          return existing.getFullYear() === day.getFullYear();
        default:
          return false;
      }
    });
  }

  private sameDay(a: Date, b: Date) {
    return (
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    );
  }

  private sameWeek(a: Date, b: Date) {
    const weekStart = (d: Date) => {
      const t = new Date(d);
      t.setDate(t.getDate() - t.getDay());
      t.setHours(0, 0, 0, 0);
      return t.getTime();
    };
    return weekStart(a) === weekStart(b);
  }

  private sameMonth(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  }

  private isDue(rt: RecurringTransaction, today: Date): boolean {
    const lastRun = rt.lastRunDate ? new Date(rt.lastRunDate) : null;
    if (lastRun) lastRun.setHours(0, 0, 0, 0);

    switch (rt.frequency) {
      case 'DAILY':
        return !lastRun || !this.sameDay(lastRun, today);

      case 'WEEKDAYS': {
        const dow = today.getDay();
        if (dow === 0 || dow === 6) return false;
        return !lastRun || !this.sameDay(lastRun, today);
      }

      case 'WEEKLY': {
        if (today.getDay() !== (rt.dayOfWeek ?? 1)) return false;
        if (!lastRun) return true;
        return !this.sameWeek(lastRun, today);
      }

      case 'MONTHLY': {
        if (today.getDate() !== (rt.dayOfMonth ?? 1)) return false;
        if (!lastRun) return true;
        return !this.sameMonth(lastRun, today);
      }

      case 'YEARLY': {
        if (
          today.getDate() !== (rt.dayOfMonth ?? 1) ||
          today.getMonth() + 1 !== (rt.month ?? 1)
        )
          return false;
        if (!lastRun) return true;
        return lastRun.getFullYear() !== today.getFullYear();
      }

      default:
        return false;
    }
  }
}
