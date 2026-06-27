import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogService } from '../log/log.service';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateHouseholdDto } from './dto/update-household.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

const DEFAULT_CATEGORIES = [
  { label: '🛒 Courses', color: '#22c55e' },
  { label: '🏠 Logement', color: '#3b82f6' },
  { label: '🚗 Transport', color: '#f97316' },
  { label: '🍽️ Restaurants', color: '#ef4444' },
  { label: '💊 Santé', color: '#ec4899' },
  { label: '🎬 Loisirs', color: '#a855f7' },
  { label: '📱 Abonnements', color: '#06b6d4' },
  { label: '💼 Salaire', color: '#84cc16' },
  { label: '📦 Divers', color: '#94a3b8' },
];

const MEMBER_SELECT = {
  id: true,
  role: true,
  joinedAt: true,
  user: { select: { id: true, name: true, email: true, avatarUrl: true } },
};

@Injectable()
export class HouseholdsService {
  constructor(
    private prisma: PrismaService,
    private log: LogService,
  ) {}

  async create(userId: string, dto: CreateHouseholdDto) {
    const household = await this.prisma.household.create({
      data: {
        name: dto.name,
        members: { create: { userId, role: 'ADMIN' } },
        categories: { create: DEFAULT_CATEGORIES },
      },
      include: { members: { select: MEMBER_SELECT } },
    });
    void this.log.log(household.id, userId, 'HOUSEHOLD_CREATED', { name: dto.name });
    return household;
  }

  async findOne(householdId: string, userId: string) {
    await this.assertMember(householdId, userId);
    return this.prisma.household.findUniqueOrThrow({
      where: { id: householdId },
      include: { members: { select: MEMBER_SELECT } },
    });
  }

  async update(householdId: string, userId: string, dto: UpdateHouseholdDto) {
    await this.assertAdmin(householdId, userId);
    const household = await this.prisma.household.update({
      where: { id: householdId },
      data: { name: dto.name },
      include: { members: { select: MEMBER_SELECT } },
    });
    void this.log.log(householdId, userId, 'HOUSEHOLD_RENAMED', { name: dto.name });
    return household;
  }

  async deactivate(householdId: string, userId: string) {
    await this.assertAdmin(householdId, userId);
    void this.log.log(householdId, userId, 'HOUSEHOLD_DEACTIVATED');
    return this.prisma.household.update({
      where: { id: householdId },
      data: { isActive: false },
      select: { id: true, isActive: true },
    });
  }

  async inviteMember(householdId: string, adminId: string, dto: InviteMemberDto) {
    await this.assertAdmin(householdId, adminId);

    const target = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!target) throw new NotFoundException(`Aucun compte pour ${dto.email}`);

    const exists = await this.prisma.householdMember.findUnique({
      where: { userId_householdId: { userId: target.id, householdId } },
    });
    if (exists) throw new ConflictException('Membre déjà dans le foyer');

    const member = await this.prisma.householdMember.create({
      data: { userId: target.id, householdId, role: 'MEMBER' },
      select: MEMBER_SELECT,
    });
    void this.log.log(householdId, adminId, 'MEMBER_INVITED', { email: dto.email });
    return member;
  }

  async updateMemberRole(householdId: string, adminId: string, memberId: string, dto: UpdateMemberRoleDto) {
    await this.assertAdmin(householdId, adminId);
    if (memberId === adminId) throw new BadRequestException('Vous ne pouvez pas changer votre propre rôle');

    const member = await this.prisma.householdMember.findUnique({
      where: { userId_householdId: { userId: memberId, householdId } },
    });
    if (!member) throw new NotFoundException('Membre introuvable');

    const updated = await this.prisma.householdMember.update({
      where: { userId_householdId: { userId: memberId, householdId } },
      data: { role: dto.role },
      select: MEMBER_SELECT,
    });
    void this.log.log(householdId, adminId, 'MEMBER_ROLE_CHANGED', { memberId, role: dto.role });
    return updated;
  }

  async removeMember(householdId: string, adminId: string, memberId: string) {
    await this.assertAdmin(householdId, adminId);
    if (memberId === adminId) {
      const count = await this.prisma.householdMember.count({ where: { householdId } });
      if (count <= 1) {
        throw new ForbiddenException(
          'Vous êtes le seul membre de ce foyer. Désactivez-le pour le quitter.',
        );
      }
      throw new ForbiddenException('Un administrateur ne peut pas se retirer lui-même.');
    }
    await this.prisma.householdMember.delete({
      where: { userId_householdId: { userId: memberId, householdId } },
    });
    void this.log.log(householdId, adminId, 'MEMBER_REMOVED', { memberId });
  }

  async memberSuggestions(householdId: string, userId: string) {
    await this.assertAdmin(householdId, userId);
    const existing = await this.prisma.householdMember.findMany({
      where: { householdId },
      select: { userId: true },
    });
    const excludedIds = existing.map((m) => m.userId);
    return this.prisma.user.findMany({
      where: { id: { notIn: excludedIds } },
      select: { id: true, name: true, email: true, avatarUrl: true },
      orderBy: { name: 'asc' },
    });
  }

  async findHistory(householdId: string, userId: string) {
    await this.assertAdmin(householdId, userId);
    return this.log.findAll(householdId);
  }

  async assertMember(householdId: string, userId: string) {
    const m = await this.prisma.householdMember.findUnique({
      where: { userId_householdId: { userId, householdId } },
    });
    if (!m) throw new ForbiddenException('Accès refusé à ce foyer');
    return m;
  }

  async assertAdmin(householdId: string, userId: string) {
    const m = await this.assertMember(householdId, userId);
    if (m.role !== 'ADMIN') throw new ForbiddenException('Réservé aux administrateurs');
    return m;
  }
}
