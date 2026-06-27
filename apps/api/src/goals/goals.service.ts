import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HouseholdsService } from '../households/households.service';
import { LogService } from '../log/log.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { ContributeGoalDto } from './dto/contribute-goal.dto';
import { ReorderGoalsDto } from './dto/reorder-goals.dto';

const GOAL_INCLUDE = {
  contributions: { orderBy: { date: 'desc' as const } },
  createdBy: { select: { id: true, name: true } },
};

@Injectable()
export class GoalsService {
  constructor(
    private prisma: PrismaService,
    private households: HouseholdsService,
    private log: LogService,
  ) {}

  async findAll(householdId: string, userId: string) {
    await this.households.assertMember(householdId, userId);
    const goals = await this.prisma.savingsGoal.findMany({
      where: { householdId },
      include: GOAL_INCLUDE,
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
    return goals.map(this.withProgress);
  }

  async reorder(householdId: string, userId: string, dto: ReorderGoalsDto) {
    await this.households.assertMember(householdId, userId);
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.savingsGoal.updateMany({
          where: { id: item.id, householdId },
          data: { order: item.order },
        }),
      ),
    );
    return this.findAll(householdId, userId);
  }

  async create(householdId: string, userId: string, dto: CreateGoalDto) {
    await this.households.assertMember(householdId, userId);
    const goal = await this.prisma.savingsGoal.create({
      data: {
        name: dto.name,
        targetAmount: dto.targetAmount,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        householdId,
        createdById: userId,
      },
      include: GOAL_INCLUDE,
    });
    void this.log.log(householdId, userId, 'GOAL_CREATED', { name: dto.name, targetAmount: dto.targetAmount });
    return this.withProgress(goal);
  }

  async update(householdId: string, goalId: string, userId: string, dto: UpdateGoalDto) {
    await this.households.assertMember(householdId, userId);
    await this.assertExists(goalId, householdId);
    const goal = await this.prisma.savingsGoal.update({
      where: { id: goalId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.targetAmount !== undefined && { targetAmount: dto.targetAmount }),
        ...(dto.isCompleted !== undefined && { isCompleted: dto.isCompleted }),
        ...('deadline' in dto && { deadline: dto.deadline ? new Date(dto.deadline) : null }),
      },
      include: GOAL_INCLUDE,
    });
    void this.log.log(householdId, userId, 'GOAL_UPDATED', { name: goal.name });
    return this.withProgress(goal);
  }

  async remove(householdId: string, goalId: string, userId: string) {
    await this.households.assertMember(householdId, userId);
    await this.assertExists(goalId, householdId);
    await this.prisma.savingsGoal.delete({ where: { id: goalId } });
    void this.log.log(householdId, userId, 'GOAL_DELETED');
  }

  async contribute(householdId: string, goalId: string, userId: string, dto: ContributeGoalDto) {
    await this.households.assertMember(householdId, userId);
    await this.assertExists(goalId, householdId);
    await this.prisma.goalContribution.create({
      data: { goalId, amount: dto.amount, note: dto.note },
    });
    const goal = await this.prisma.savingsGoal.findUniqueOrThrow({
      where: { id: goalId },
      include: GOAL_INCLUDE,
    });
    void this.log.log(householdId, userId, 'GOAL_CONTRIBUTION_ADDED', { amount: dto.amount });
    return this.withProgress(goal);
  }

  private withProgress(goal: GoalWithContributions) {
    const savedAmount = goal.contributions.reduce((sum, c) => sum + c.amount, 0);
    const percent = goal.targetAmount > 0 ? Math.min(100, Math.round((savedAmount / goal.targetAmount) * 100)) : 0;

    let monthlyRecommended: number | null = null;
    if (goal.deadline && !goal.isCompleted) {
      const now = new Date();
      const months =
        (goal.deadline.getFullYear() - now.getFullYear()) * 12 +
        (goal.deadline.getMonth() - now.getMonth());
      const remaining = goal.targetAmount - savedAmount;
      monthlyRecommended = months > 0 ? Math.ceil(remaining / months) : null;
    }

    return { ...goal, savedAmount, percent, monthlyRecommended };
  }

  private async assertExists(goalId: string, householdId: string) {
    const goal = await this.prisma.savingsGoal.findUnique({ where: { id: goalId } });
    if (!goal || goal.householdId !== householdId) throw new NotFoundException("Objectif introuvable");
  }
}

type GoalWithContributions = Awaited<ReturnType<PrismaService['savingsGoal']['findUniqueOrThrow']>> & {
  contributions: { amount: number; note: string | null; date: Date; id: string; createdAt: Date; goalId: string }[];
  createdBy: { id: string; name: string };
};
