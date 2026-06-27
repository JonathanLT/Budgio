import {
  Controller, Get, Post, Patch, Delete, Put,
  Body, Param, Req, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { ContributeGoalDto } from './dto/contribute-goal.dto';
import { ReorderGoalsDto } from './dto/reorder-goals.dto';

@ApiTags('goals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('households/:householdId/goals')
export class GoalsController {
  constructor(private goalsService: GoalsService) {}

  @Get()
  @ApiOperation({ summary: "Lister les objectifs d'épargne du foyer" })
  findAll(@Req() req: Request, @Param('householdId') householdId: string) {
    return this.goalsService.findAll(householdId, (req.user as User).id);
  }

  @Post()
  @ApiOperation({ summary: "Créer un objectif d'épargne" })
  create(
    @Req() req: Request,
    @Param('householdId') householdId: string,
    @Body() dto: CreateGoalDto,
  ) {
    return this.goalsService.create(householdId, (req.user as User).id, dto);
  }

  @Put('reorder')
  @ApiOperation({ summary: "Réordonner les objectifs" })
  reorder(
    @Req() req: Request,
    @Param('householdId') householdId: string,
    @Body() dto: ReorderGoalsDto,
  ) {
    return this.goalsService.reorder(householdId, (req.user as User).id, dto);
  }

  @Patch(':goalId')
  @ApiOperation({ summary: "Modifier un objectif" })
  update(
    @Req() req: Request,
    @Param('householdId') householdId: string,
    @Param('goalId') goalId: string,
    @Body() dto: UpdateGoalDto,
  ) {
    return this.goalsService.update(householdId, goalId, (req.user as User).id, dto);
  }

  @Delete(':goalId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Supprimer un objectif" })
  remove(
    @Req() req: Request,
    @Param('householdId') householdId: string,
    @Param('goalId') goalId: string,
  ) {
    return this.goalsService.remove(householdId, goalId, (req.user as User).id);
  }

  @Post(':goalId/contribute')
  @ApiOperation({ summary: "Ajouter une contribution à un objectif" })
  contribute(
    @Req() req: Request,
    @Param('householdId') householdId: string,
    @Param('goalId') goalId: string,
    @Body() dto: ContributeGoalDto,
  ) {
    return this.goalsService.contribute(householdId, goalId, (req.user as User).id, dto);
  }
}
