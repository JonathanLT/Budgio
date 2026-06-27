import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Req, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HouseholdsService } from './households.service';
import { CreateHouseholdDto } from './dto/create-household.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateHouseholdDto } from './dto/update-household.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';

@ApiTags('households')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('households')
export class HouseholdsController {
  constructor(private householdsService: HouseholdsService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un foyer' })
  create(@Req() req: Request, @Body() dto: CreateHouseholdDto) {
    return this.householdsService.create((req.user as User).id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détails du foyer + membres' })
  findOne(@Req() req: Request, @Param('id') id: string) {
    return this.householdsService.findOne(id, (req.user as User).id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Renommer le foyer (ADMIN)' })
  update(@Req() req: Request, @Param('id') id: string, @Body() dto: UpdateHouseholdDto) {
    return this.householdsService.update(id, (req.user as User).id, dto);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Désactiver le foyer (ADMIN)' })
  deactivate(@Req() req: Request, @Param('id') id: string) {
    return this.householdsService.deactivate(id, (req.user as User).id);
  }

  @Get(':id/members/suggestions')
  @ApiOperation({ summary: 'Utilisateurs Budgio non membres du foyer (ADMIN)' })
  memberSuggestions(@Req() req: Request, @Param('id') id: string) {
    return this.householdsService.memberSuggestions(id, (req.user as User).id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Inviter un membre (ADMIN)' })
  invite(@Req() req: Request, @Param('id') id: string, @Body() dto: InviteMemberDto) {
    return this.householdsService.inviteMember(id, (req.user as User).id, dto);
  }

  @Patch(':id/members/:memberId')
  @ApiOperation({ summary: 'Changer le rôle d\'un membre (ADMIN)' })
  updateRole(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.householdsService.updateMemberRole(id, (req.user as User).id, memberId, dto);
  }

  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Retirer un membre (ADMIN)' })
  remove(@Req() req: Request, @Param('id') id: string, @Param('memberId') memberId: string) {
    return this.householdsService.removeMember(id, (req.user as User).id, memberId);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Historique des événements du foyer (ADMIN)' })
  history(@Req() req: Request, @Param('id') id: string) {
    return this.householdsService.findHistory(id, (req.user as User).id);
  }
}
