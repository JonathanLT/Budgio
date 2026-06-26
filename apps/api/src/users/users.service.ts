import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async updateTheme(userId: string, theme: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { theme } });
  }

  async getHouseholds(userId: string) {
    const memberships = await this.prisma.householdMember.findMany({
      where: { userId },
      include: {
        household: {
          include: {
            members: {
              include: { user: { select: { id: true, name: true, email: true, avatarUrl: true } } },
            },
          },
        },
      },
    });
    return memberships.map((m) => ({ ...m.household, myRole: m.role }));
  }
}
