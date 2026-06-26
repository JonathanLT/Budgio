import {
  Controller,
  Get,
  Post,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshDto } from './dto/refresh.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // 20 tentatives / minute par IP
  @Get('google')
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initier la connexion Google OAuth' })
  googleLogin() {}

  @Get('google/callback')
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Callback OAuth Google' })
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user as User;
    const tokens = await this.authService.generateTokens(user);
    const frontend = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    res.redirect(
      `${frontend}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
    );
  }

  // 10 tentatives / minute par IP — endpoint le plus sensible
  @Post('refresh')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rafraîchir les tokens' })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Déconnexion (révocation des tokens)' })
  async logout(@Req() req: Request) {
    const user = req.user as User;
    const token = req.headers.authorization?.replace('Bearer ', '') ?? '';
    await this.authService.logout(user.id, token);
  }
}
