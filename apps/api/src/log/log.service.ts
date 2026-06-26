import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LogService {
  private readonly logger = new Logger(LogService.name);

  constructor(private prisma: PrismaService) {}

  log(
    householdId: string,
    userId: string | null,
    event: string,
    meta?: Record<string, unknown>,
  ) {
    return this.prisma.householdLog.create({
      data: { householdId, userId, event, meta: meta !== undefined ? (meta as Prisma.InputJsonValue) : Prisma.JsonNull },
    }).catch((err: unknown) => this.logger.error(`Failed to write log [${event}]`, err));
  }

  findAll(householdId: string) {
    return this.prisma.householdLog.findMany({
      where: { householdId },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
  }
}
