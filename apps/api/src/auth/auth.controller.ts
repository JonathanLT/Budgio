import {
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

const REFRESH_COOKIE = 'budgio_refresh';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/auth',
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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
    const { accessToken, refreshToken } = await this.authService.generateTokens(user);
    const frontend = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';

    res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTS);
    // Pass only the short-lived access token via URL fragment (never sent in Referer headers)
    res.redirect(`${frontend}/auth/callback#access=${accessToken}`);
  }

  @Post('refresh')
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rafraîchir les tokens' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawToken: string | undefined = req.cookies?.[REFRESH_COOKIE];
    if (!rawToken) throw new UnauthorizedException('Refresh token manquant');

    const tokens = await this.authService.refresh(rawToken);
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, COOKIE_OPTS);
    return { accessToken: tokens.accessToken };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Déconnexion (révocation des tokens)' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = req.user as User;
    const token = req.headers.authorization?.replace('Bearer ', '') ?? '';
    await this.authService.logout(user.id, token);
    res.clearCookie(REFRESH_COOKIE, { ...COOKIE_OPTS, maxAge: undefined });
  }
}
