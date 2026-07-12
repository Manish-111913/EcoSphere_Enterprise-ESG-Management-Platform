import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuditAction } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AppConfigService } from '../../core/config/app-config.service';
import { AuthorizationService } from '../../core/security/authorization.service';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { toUserView, UserView } from '../../common/serializers/user.view';
import { randomToken, sha256Hex } from '../../common/hash';
import { TokenService } from './token.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/auth.dto';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: UserView;
  permissions: string[];
}

export interface SignupDepartmentOption {
  id: string;
  name: string;
  code: string;
}

interface RequestMeta {
  ip?: string | null;
  userAgent?: string | null;
}

const USER_INCLUDE = { userRoles: { include: { role: true } } } as const;

@Injectable()
export class AuthService {
  // In-memory lockout counter (single-instance; spec §A9 "lockout from settings").
  private readonly failures = new Map<
    string,
    { count: number; lockedUntil: number }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: AppConfigService,
    private readonly authz: AuthorizationService,
    private readonly tokens: TokenService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ─────────────── login / session ───────────────
  async login(dto: LoginDto, meta: RequestMeta): Promise<LoginResult> {
    const email = dto.email.toLowerCase();
    this.assertNotLocked(email);

    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: USER_INCLUDE,
    });
    if (!user) {
      this.recordFailure(email);
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }
    if (!user.isActive) {
      throw new ForbiddenException({
        code: 'ACCOUNT_INACTIVE',
        message: 'Account is inactive',
      });
    }
    const ok = await this.verifyPassword(user.passwordHash, dto.password);
    if (!ok) {
      this.recordFailure(email);
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }
    this.failures.delete(email);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const roleIds = user.userRoles.map((ur) => ur.roleId);
    const roleNames = user.userRoles.map((ur) => ur.role.name);
    const pair = await this.tokens.issuePair({
      id: user.id,
      email: user.email,
      roleIds,
      roleNames,
    });
    await this.audit(user.id, AuditAction.LOGIN, 'auth', user.id, meta);

    return {
      ...pair,
      user: toUserView(user),
      permissions: this.authz.permissionsForRoles(roleIds),
    };
  }

  async refresh(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    return this.tokens.rotate(refreshToken);
  }

  async logout(refreshToken: string): Promise<{ message: string }> {
    await this.tokens.revoke(refreshToken);
    return { message: 'Logged out' };
  }

  async me(user: AuthenticatedUser): Promise<{
    user: UserView;
    roles: string[];
    permissions: string[];
  }> {
    const full = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      include: USER_INCLUDE,
    });
    return {
      user: toUserView(full),
      roles: user.roleNames,
      permissions: user.permissions,
    };
  }

  async changePassword(
    user: AuthenticatedUser,
    dto: ChangePasswordDto,
    meta: RequestMeta,
  ): Promise<{ message: string }> {
    const full = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    const ok = await this.verifyPassword(full.passwordHash, dto.currentPassword);
    if (!ok) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Current password is incorrect',
      });
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await argon2.hash(dto.newPassword), updatedBy: user.id },
    });
    await this.tokens.revokeAllForUser(user.id); // spec §A9: revoke on password change
    await this.audit(user.id, AuditAction.UPDATE, 'user', user.id, meta);
    return { message: 'Password changed; please sign in again' };
  }

  // ─────────────── registration / verification ───────────────
  async register(
    dto: RegisterDto,
    meta: RequestMeta,
  ): Promise<{ user: UserView; verificationToken?: string; message: string }> {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException({
        code: 'EMAIL_TAKEN',
        message: 'Email is already registered',
      });
    }

    const roleName = this.settings.getString('default_signup_role', 'Employee');
    const role =
      (await this.prisma.role.findUnique({ where: { name: roleName } })) ??
      (await this.prisma.role.findFirstOrThrow());
    const departmentId = dto.departmentId ?? (await this.resolveDefaultDepartment());

    const user = await this.prisma.user.create({
      data: {
        employeeCode: `EMP-${randomToken(4).toUpperCase().slice(0, 6)}`,
        email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash: await argon2.hash(dto.password),
        departmentId,
        emailVerifiedAt: null, // unverified (spec §A6.1)
        isActive: true,
        userRoles: { create: { roleId: role.id } },
      },
      include: USER_INCLUDE,
    });
    await this.audit(user.id, AuditAction.CREATE, 'user', user.id, meta);

    const verificationToken = await this.signEmailVerifyToken(user.id);
    return {
      user: toUserView(user),
      message: 'Registered; please verify your email',
      ...(this.devReturnTokens() ? { verificationToken } : {}),
    };
  }

  async signupOptions(): Promise<{ departments: SignupDepartmentOption[] }> {
    const departments = await this.prisma.department.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    });
    return { departments };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<{ message: string }> {
    let payload: { sub: string; typ: string };
    try {
      payload = await this.jwt.verifyAsync(dto.token, {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnprocessableEntityException({
        code: 'TOKEN_EXPIRED',
        message: 'Verification token is invalid or expired',
      });
    }
    if (payload.typ !== 'email_verify') {
      throw new UnprocessableEntityException({
        code: 'INVALID_TOKEN',
        message: 'Not an email verification token',
      });
    }
    await this.prisma.user.update({
      where: { id: payload.sub },
      data: { emailVerifiedAt: new Date() },
    });
    return { message: 'Email verified' };
  }

  // ─────────────── password reset ───────────────
  async forgotPassword(
    dto: ForgotPasswordDto,
  ): Promise<{ message: string; resetToken?: string }> {
    const email = dto.email.toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
    const message = 'If that email exists, a reset link has been sent';
    if (!user) return { message }; // never reveal existence (spec §A6.1)

    const raw = randomToken();
    const minutes = this.settings.getNumber('reset_expiry_minutes', 30);
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256Hex(raw),
        expiresAt: new Date(Date.now() + minutes * 60 * 1000),
      },
    });
    return { message, ...(this.devReturnTokens() ? { resetToken: raw } : {}) };
  }

  async resetPassword(
    dto: ResetPasswordDto,
    meta: RequestMeta,
  ): Promise<{ message: string }> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: sha256Hex(dto.token) },
    });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new UnprocessableEntityException({
        code: 'INVALID_TOKEN',
        message: 'Reset token is invalid, used, or expired',
      });
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: await argon2.hash(dto.newPassword) },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);
    await this.tokens.revokeAllForUser(record.userId);
    await this.audit(record.userId, AuditAction.UPDATE, 'user', record.userId, meta);
    return { message: 'Password has been reset' };
  }

  // ─────────────── helpers ───────────────
  private async verifyPassword(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }

  private async signEmailVerifyToken(userId: string): Promise<string> {
    const hours = this.settings.getNumber('verify_expiry_hours', 24);
    return this.jwt.signAsync(
      { sub: userId, typ: 'email_verify' },
      {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        expiresIn: `${hours}h`,
      },
    );
  }

  private devReturnTokens(): boolean {
    return this.settings.getBoolean('dev_return_tokens', false);
  }

  private async resolveDefaultDepartment(): Promise<string> {
    const dept = await this.prisma.department.findFirst({
      where: { isActive: true, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    if (!dept) {
      throw new UnprocessableEntityException({
        code: 'NO_DEPARTMENT',
        message: 'No department available for signup',
      });
    }
    return dept.id;
  }

  private assertNotLocked(email: string): void {
    const entry = this.failures.get(email);
    if (entry && entry.lockedUntil > Date.now()) {
      throw new HttpException(
        { code: 'ACCOUNT_LOCKED', message: 'Too many attempts; try again later' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private recordFailure(email: string): void {
    const threshold = this.settings.getNumber('login_lockout_threshold', 5);
    const minutes = this.settings.getNumber('login_lockout_minutes', 15);
    const entry = this.failures.get(email) ?? { count: 0, lockedUntil: 0 };
    entry.count += 1;
    if (entry.count >= threshold) {
      entry.lockedUntil = Date.now() + minutes * 60 * 1000;
      entry.count = 0;
    }
    this.failures.set(email, entry);
  }

  private async audit(
    actorId: string | null,
    action: AuditAction,
    entityType: string,
    entityId: string,
    meta: RequestMeta,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
      },
    });
  }
}
