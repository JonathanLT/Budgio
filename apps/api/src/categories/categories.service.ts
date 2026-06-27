import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogService } from '../log/log.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ReorderCategoriesDto } from './dto/reorder-categories.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private prisma: PrismaService,
    private log: LogService,
  ) {}

  async findAll(householdId: string, userId: string) {
    await this.assertMember(householdId, userId);
    return this.prisma.category.findMany({
      where: { householdId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async reorder(householdId: string, userId: string, dto: ReorderCategoriesDto) {
    await this.assertMember(householdId, userId);
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.category.updateMany({
          where: { id: item.id, householdId },
          data: { order: item.order },
        }),
      ),
    );
    return this.findAll(householdId, userId);
  }

  async create(householdId: string, userId: string, dto: CreateCategoryDto) {
    await this.assertMember(householdId, userId);
    const cat = await this.prisma.category.create({
      data: { ...dto, householdId },
    });
    void this.log.log(householdId, userId, 'CATEGORY_CREATED', { label: dto.label });
    return cat;
  }

  async update(householdId: string, categoryId: string, userId: string, dto: UpdateCategoryDto) {
    await this.assertMember(householdId, userId);
    await this.assertExists(categoryId, householdId);
    const cat = await this.prisma.category.update({
      where: { id: categoryId },
      data: dto,
    });
    void this.log.log(householdId, userId, 'CATEGORY_UPDATED', { label: cat.label });
    return cat;
  }

  async remove(householdId: string, categoryId: string, userId: string) {
    await this.assertAdmin(householdId, userId);
    await this.assertExists(categoryId, householdId);
    await this.prisma.category.delete({ where: { id: categoryId } });
    void this.log.log(householdId, userId, 'CATEGORY_DELETED');
  }

  private async assertMember(householdId: string, userId: string) {
    const m = await this.prisma.householdMember.findUnique({
      where: { userId_householdId: { userId, householdId } },
    });
    if (!m) throw new ForbiddenException('Accès refusé à ce foyer');
    return m;
  }

  private async assertAdmin(householdId: string, userId: string) {
    const m = await this.assertMember(householdId, userId);
    if (m.role !== 'ADMIN') throw new ForbiddenException('Réservé aux administrateurs');
  }

  private async assertExists(categoryId: string, householdId: string) {
    const cat = await this.prisma.category.findUnique({ where: { id: categoryId } });
    if (!cat || cat.householdId !== householdId) throw new NotFoundException('Catégorie introuvable');
  }
}
