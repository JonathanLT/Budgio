import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

function tokenPrefix(raw: string): string {
  return createHash('sha256').update(raw).digest('hex').substring(0, 16);
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private redis: RedisService,
    private config: ConfigService,
  ) {}

  async findOrCreateUser(profile: GoogleProfile): Promise<User> {
    const existing = await this.prisma.user.findUnique({
      where: { googleId: profile.googleId },
    });
    if (existing) {
      return this.prisma.user.update({
        where: { id: existing.id },
        data: { name: profile.name, avatarUrl: profile.avatarUrl },
      });
    }
    return this.prisma.user.create({ data: profile });
  }

  async generateTokens(user: User) {
    const jti = randomUUID();
    const accessToken = this.jwt.sign(
      { sub: user.id, email: user.email, jti },
      {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN') ?? '15m',
      },
    );

    const rawRefreshToken = randomUUID();
    const prefix = tokenPrefix(rawRefreshToken);
    const hash = await bcrypt.hash(rawRefreshToken, 10);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: { tokenPrefix: prefix, tokenHash: hash, userId: user.id, expiresAt },
    });

    return { accessToken, refreshToken: rawRefreshToken };
  }

  async refresh(rawToken: string) {
    const prefix = tokenPrefix(rawToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenPrefix: prefix, expiresAt: { gt: new Date() } },
      include: { user: true },
    });

    if (!stored) throw new UnauthorizedException('Refresh token invalide');

    const match = await bcrypt.compare(rawToken, stored.tokenHash);
    if (!match) throw new UnauthorizedException('Refresh token invalide');

    const deleted = await this.prisma.refreshToken.deleteMany({ where: { id: stored.id } });
    if (deleted.count === 0) throw new UnauthorizedException('Refresh token déjà consommé');

    return this.generateTokens(stored.user);
  }

  async logout(userId: string, accessToken: string) {
    try {
      const decoded = this.jwt.verify(accessToken, {
        secret: this.config.getOrThrow('JWT_ACCESS_SECRET'),
        ignoreExpiration: true,
      }) as { jti?: string; exp?: number };
      if (decoded?.jti) {
        const ttl = (decoded.exp ?? 0) - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await this.redis.set(`blacklist:${decoded.jti}`, '1', ttl);
        }
      }
    } catch {
      // token structurally invalid — still revoke refresh tokens below
    }
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }
}
