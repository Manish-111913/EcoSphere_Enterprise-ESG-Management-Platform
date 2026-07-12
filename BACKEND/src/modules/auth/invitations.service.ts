import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AppConfigService } from '../../core/config/app-config.service';
import { AuthorizationService } from '../../core/security/authorization.service';
import { toUserView, UserView } from '../../common/serializers/user.view';
import { randomToken, sha256Hex } from '../../common/hash';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { TokenService } from './token.service';
import { AcceptInvitationDto, CreateInvitationDto } from './dto/invitation.dto';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: AppConfigService,
    private readonly authz: AuthorizationService,
    private readonly tokens: TokenService,
  ) {}

  async create(dto: CreateInvitationDto, actor: AuthenticatedUser) {
    const email = dto.email.toLowerCase();
    const [role, dept, existingUser] = await Promise.all([
      this.prisma.role.findUnique({ where: { id: dto.roleId } }),
      this.prisma.department.findUnique({ where: { id: dto.departmentId } }),
      this.prisma.user.findUnique({ where: { email } }),
    ]);
    if (!role) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Role not found' });
    if (!dept) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Department not found' });
    if (existingUser) {
      throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'A user with that email already exists' });
    }

    const raw = randomToken();
    const hours = this.settings.getNumber('invite_expiry_hours', 72);
    const invitation = await this.prisma.invitation.create({
      data: {
        email,
        roleId: dto.roleId,
        departmentId: dto.departmentId,
        tokenHash: sha256Hex(raw),
        invitedBy: actor.id,
        expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000),
      },
    });
    await this.audit(actor.id, AuditAction.CREATE, invitation.id);

    // Token is returned to the admin — it is the delivery mechanism (no mailer).
    return {
      id: invitation.id,
      email: invitation.email,
      roleId: invitation.roleId,
      departmentId: invitation.departmentId,
      expiresAt: invitation.expiresAt,
      token: raw,
      acceptPath: `/accept-invite?token=${raw}`,
    };
  }

  async list() {
    const rows = await this.prisma.invitation.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      roleId: r.roleId,
      departmentId: r.departmentId,
      invitedBy: r.invitedBy,
      expiresAt: r.expiresAt,
      acceptedAt: r.acceptedAt,
      status: r.acceptedAt
        ? 'ACCEPTED'
        : r.expiresAt < new Date()
          ? 'EXPIRED'
          : 'PENDING',
    }));
  }

  async remove(id: string, actor: AuthenticatedUser): Promise<{ message: string }> {
    const invitation = await this.prisma.invitation.findUnique({ where: { id } });
    if (!invitation) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Invitation not found' });
    }
    await this.prisma.invitation.delete({ where: { id } });
    await this.audit(actor.id, AuditAction.DELETE, id);
    return { message: 'Invitation revoked' };
  }

  async accept(dto: AcceptInvitationDto): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: UserView;
    permissions: string[];
  }> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash: sha256Hex(dto.token) },
    });
    if (!invitation || invitation.acceptedAt || invitation.expiresAt < new Date()) {
      throw new UnprocessableEntityException({
        code: 'INVALID_TOKEN',
        message: 'Invitation is invalid, already used, or expired',
      });
    }
    if (await this.prisma.user.findUnique({ where: { email: invitation.email } })) {
      throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'A user with that email already exists' });
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          employeeCode: `EMP-${randomToken(4).toUpperCase().slice(0, 6)}`,
          email: invitation.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          passwordHash: await argon2.hash(dto.password),
          departmentId: invitation.departmentId,
          emailVerifiedAt: new Date(), // invited users are verified (spec §A6.1)
          isActive: true,
          userRoles: { create: { roleId: invitation.roleId } },
        },
        include: { userRoles: { include: { role: true } } },
      });
      await tx.invitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });
      return created;
    });
    await this.audit(user.id, AuditAction.CREATE, user.id, 'user');

    const roleIds = user.userRoles.map((ur) => ur.roleId);
    const pair = await this.tokens.issuePair({
      id: user.id,
      email: user.email,
      roleIds,
      roleNames: user.userRoles.map((ur) => ur.role.name),
    });
    return {
      ...pair,
      user: toUserView(user),
      permissions: this.authz.permissionsForRoles(roleIds),
    };
  }

  private async audit(
    actorId: string,
    action: AuditAction,
    entityId: string,
    entityType = 'invitation',
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: { actorId, action, entityType, entityId },
    });
  }
}
