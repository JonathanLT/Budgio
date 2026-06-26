import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Req, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('households/:householdId/categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les catégories du foyer' })
  findAll(@Req() req: Request, @Param('householdId') householdId: string) {
    return this.categoriesService.findAll(householdId, (req.user as User).id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer une catégorie' })
  create(@Req() req: Request, @Param('householdId') householdId: string, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(householdId, (req.user as User).id, dto);
  }

  @Patch(':categoryId')
  @ApiOperation({ summary: 'Modifier une catégorie' })
  update(
    @Req() req: Request,
    @Param('householdId') householdId: string,
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(householdId, categoryId, (req.user as User).id, dto);
  }

  @Delete(':categoryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une catégorie (ADMIN)' })
  remove(
    @Req() req: Request,
    @Param('householdId') householdId: string,
    @Param('categoryId') categoryId: string,
  ) {
    return this.categoriesService.remove(householdId, categoryId, (req.user as User).id);
  }
}
