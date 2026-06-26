import { Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Profil utilisateur courant' })
  me(@Req() req: Request) {
    const user = req.user as User;
    const { googleId: _g, ...safeUser } = user;
    return safeUser;
  }

  @Patch('me')
  @ApiOperation({ summary: 'Mettre à jour le profil (thème)' })
  async updateProfile(@Req() req: Request, @Body() dto: UpdateProfileDto) {
    const user = req.user as User;
    const updated = await this.usersService.updateTheme(user.id, dto.theme);
    const { googleId: _g, ...safeUser } = updated;
    return safeUser;
  }

  @Get('me/households')
  @ApiOperation({ summary: 'Foyers de l\'utilisateur' })
  myHouseholds(@Req() req: Request) {
    const user = req.user as User;
    return this.usersService.getHouseholds(user.id);
  }
}
