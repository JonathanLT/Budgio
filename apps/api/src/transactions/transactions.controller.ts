import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@ApiTags('transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('households/:householdId/transactions')
export class TransactionsController {
  constructor(private txService: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les transactions (entrées et sorties)' })
  @ApiQuery({ name: 'year', required: false, type: Number })
  @ApiQuery({ name: 'month', required: false, type: Number })
  findAll(
    @Req() req: Request,
    @Param('householdId') householdId: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.txService.findAll(
      householdId,
      (req.user as User).id,
      year ? +year : undefined,
      month ? +month : undefined,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques 12 mois — solde, moyennes, top catégories' })
  stats(
    @Req() req: Request,
    @Param('householdId') householdId: string,
  ) {
    return this.txService.stats(householdId, (req.user as User).id);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Tableau de bord mensuel — totalIn, totalOut, balance, byCategory' })
  @ApiQuery({ name: 'year', required: true, type: Number })
  @ApiQuery({ name: 'month', required: true, type: Number })
  dashboard(
    @Req() req: Request,
    @Param('householdId') householdId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.txService.dashboard(householdId, (req.user as User).id, +year, +month);
  }

  @Post()
  @ApiOperation({ summary: 'Créer une transaction (amount > 0 = entrée, amount < 0 = sortie)' })
  create(
    @Req() req: Request,
    @Param('householdId') householdId: string,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.txService.create(householdId, (req.user as User).id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier une transaction' })
  update(
    @Req() req: Request,
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.txService.update(householdId, id, (req.user as User).id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Supprimer une transaction' })
  remove(
    @Req() req: Request,
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.txService.remove(householdId, id, (req.user as User).id);
  }
}
