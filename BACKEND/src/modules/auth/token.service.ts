import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AppConfigService } from '../../core/config/app-config.service';
import { AuthorizationService } from '../../core/security/authorization.service';
import { sha256Hex, randomToken } from '../../common/hash';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // access token TTL seconds
}

interface AccessSubject {
  id: string;
  email: string;
  roleIds: string[];
  roleNames: string[];
}

/**
 * Issues/rotates JWT access tokens and opaque, revocable refresh tokens
 * (spec §A9: access 15m, refresh 7d rotated + revocable). TTLs come from
 * settings (DB), secret from env.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly settings: AppConfigService,
    private readonly authz: AuthorizationService,
    private readonly prisma: PrismaService,
  ) {}

  async issuePair(subject: AccessSubject): Promise<TokenPair> {
    const accessToken = await this.signAccess(subject);
    const refreshToken = await this.issueRefresh(subject.id);
    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessTtlMinutes() * 60,
    };
  }

  private accessTtlMinutes(): number {
    return this.settings.getNumber('access_token_ttl_minutes', 15);
  }

  private async signAccess(subject: AccessSubject): Promise<string> {
    const permissions = this.authz.permissionsForRoles(subject.roleIds);
    return this.jwt.signAsync(
      {
        sub: subject.id,
        email: subject.email,
        roles: subject.roleNames,
        ph: this.authz.permissionHash(permissions),
        typ: 'access',
      },
      {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        expiresIn: `${this.accessTtlMinutes()}m`,
      },
    );
  }

  private async issueRefresh(userId: string): Promise<string> {
    const raw = randomToken();
    const days = this.settings.getNumber('refresh_token_ttl_days', 7);
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash: sha256Hex(raw), expiresAt },
    });
    return raw;
  }

  /** Rotate: validate + revoke the presented refresh token, issue a fresh pair. */
  async rotate(rawRefresh: string): Promise<TokenPair> {
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256Hex(rawRefresh) },
    });
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    const user = await this.prisma.user.findFirst({
      where: { id: record.userId, deletedAt: null, isActive: true },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) throw new UnauthorizedException('User inactive or not found');

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
    return this.issuePair({
      id: user.id,
      email: user.email,
      roleIds: user.userRoles.map((ur) => ur.roleId),
      roleNames: user.userRoles.map((ur) => ur.role.name),
    });
  }

  async revoke(rawRefresh: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256Hex(rawRefresh), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
