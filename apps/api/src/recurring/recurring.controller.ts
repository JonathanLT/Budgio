import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Put,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RecurringService } from './recurring.service';
import { CreateRecurringDto } from './dto/create-recurring.dto';
import { UpdateRecurringDto } from './dto/update-recurring.dto';
import { ReorderRecurringDto } from './dto/reorder-recurring.dto';

@ApiTags('recurring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('households/:householdId/recurring')
export class RecurringController {
  constructor(private recurringService: RecurringService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les mouvements fixes actifs du foyer' })
  findAll(
    @Req() req: Request,
    @Param('householdId') householdId: string,
  ) {
    return this.recurringService.findAll(householdId, (req.user as User).id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un mouvement fixe' })
  create(
    @Req() req: Request,
    @Param('householdId') householdId: string,
    @Body() dto: CreateRecurringDto,
  ) {
    return this.recurringService.create(householdId, (req.user as User).id, dto);
  }

  @Post('replay-month')
  @ApiOperation({ summary: 'Rejouer les mouvements fixes du début du mois jusqu\'à aujourd\'hui' })
  replayMonth(
    @Req() req: Request,
    @Param('householdId') householdId: string,
  ) {
    return this.recurringService.replayMonth(householdId, (req.user as User).id);
  }

  @Put('reorder')
  @ApiOperation({ summary: 'Réordonner les mouvements fixes' })
  reorder(
    @Req() req: Request,
    @Param('householdId') householdId: string,
    @Body() dto: ReorderRecurringDto,
  ) {
    return this.recurringService.reorder(householdId, (req.user as User).id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier un mouvement fixe' })
  update(
    @Req() req: Request,
    @Param('householdId') householdId: string,
    @Param('id') id: string,
    @Body() dto: UpdateRecurringDto,
  ) {
    return this.recurringService.update(householdId, id, (req.user as User).id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Désactiver un mouvement fixe' })
  remove(
    @Req() req: Request,
    @Param('householdId') householdId: string,
    @Param('id') id: string,
  ) {
    return this.recurringService.remove(householdId, id, (req.user as User).id);
  }
}
