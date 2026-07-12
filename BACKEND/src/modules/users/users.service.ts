import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, XpEntryType } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AppConfigService } from '../../core/config/app-config.service';
import { LookupService } from '../../core/lookups/lookup.service';
import { toUserView, UserView } from '../../common/serializers/user.view';
import {
  Paginated,
  paginate,
  Pagination,
} from '../../common/pagination';
import { ResolvedScope } from '../../common/types/authenticated-user';
import { randomToken } from '../../common/hash';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

const ADMIN_ROLE = 'Admin';
const USER_INCLUDE = { userRoles: { include: { role: true } } } as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: AppConfigService,
    private readonly lookups: LookupService,
  ) {}

  // ─────────────── CRUD ───────────────
  async list(p: Pagination, scope: ResolvedScope): Promise<Paginated<UserView>> {
    const where: Prisma.UserWhereInput = { deletedAt: null };
    if (scope.level === 'DEPARTMENT') where.departmentId = scope.departmentId;
    if (scope.level === 'OWN') where.id = scope.userId;
    if (p.search) {
      where.OR = [
        { firstName: { contains: p.search, mode: 'insensitive' } },
        { lastName: { contains: p.search, mode: 'insensitive' } },
        { email: { contains: p.search, mode: 'insensitive' } },
      ];
    }
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: USER_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: p.skip,
        take: p.take,
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(rows.map(toUserView), total, p);
  }

  /** Lightweight directory for owner/assignee dropdowns (any authenticated user). */
  async directory(): Promise<{ id: string; name: string; email: string; departmentId: string }[]> {
    const rows = await this.prisma.user.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, firstName: true, lastName: true, email: true, departmentId: true },
      orderBy: { firstName: 'asc' },
    });
    return rows.map((u) => ({ id: u.id, name: `${u.firstName} ${u.lastName}`, email: u.email, departmentId: u.departmentId }));
  }

  async get(id: string): Promise<UserView> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: USER_INCLUDE,
    });
    if (!user) throw this.notFound();
    return toUserView(user);
  }

  async create(
    dto: CreateUserDto,
    actorId: string,
  ): Promise<{ user: UserView; tempPassword?: string }> {
    const email = dto.email.toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Email already registered' });
    }
    await this.assertDepartment(dto.departmentId);
    await this.assertRoles(dto.roleIds);

    const generated = !dto.password;
    const password = dto.password ?? randomToken(6);
    const user = await this.prisma.user.create({
      data: {
        employeeCode: `EMP-${randomToken(4).toUpperCase().slice(0, 6)}`,
        email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        designation: dto.designation,
        passwordHash: await argon2.hash(password),
        departmentId: dto.departmentId,
        emailVerifiedAt: new Date(), // admin-created users are verified
        isActive: true,
        createdBy: actorId,
        userRoles: { create: dto.roleIds.map((roleId) => ({ roleId })) },
      },
      include: USER_INCLUDE,
    });
    const view = toUserView(user);
    return generated && this.settings.getBoolean('dev_return_tokens', false)
      ? { user: view, tempPassword: password }
      : { user: view };
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    actorId: string,
  ): Promise<UserView> {
    await this.getOrThrow(id);
    if (dto.departmentId) await this.assertDepartment(dto.departmentId);
    const user = await this.prisma.user.update({
      where: { id },
      data: { ...dto, updatedBy: actorId },
      include: USER_INCLUDE,
    });
    return toUserView(user);
  }

  async remove(id: string, actorId: string): Promise<{ message: string }> {
    if (id === actorId) {
      throw new BadRequestException({ code: 'SELF_ACTION', message: 'You cannot delete yourself' });
    }
    await this.getOrThrow(id);
    await this.assertNotLastAdmin(id);
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedBy: actorId },
    });
    return { message: 'User deleted' };
  }

  // ─────────────── roles & activation ───────────────
  async assignRoles(
    id: string,
    roleIds: string[],
    actorId: string,
  ): Promise<UserView> {
    await this.getOrThrow(id);
    await this.assertRoles(roleIds);
    const keepsAdmin = await this.roleIdsIncludeAdmin(roleIds);
    if (!keepsAdmin) await this.assertNotLastAdmin(id);

    await this.prisma.$transaction([
      this.prisma.userRole.deleteMany({ where: { userId: id } }),
      this.prisma.userRole.createMany({
        data: roleIds.map((roleId) => ({ userId: id, roleId })),
      }),
      this.prisma.user.update({ where: { id }, data: { updatedBy: actorId } }),
    ]);
    return this.get(id);
  }

  async setActive(
    id: string,
    active: boolean,
    actorId: string,
  ): Promise<UserView> {
    await this.getOrThrow(id);
    if (!active) {
      if (id === actorId) {
        throw new BadRequestException({ code: 'SELF_ACTION', message: 'You cannot deactivate yourself' });
      }
      await this.assertNotLastAdmin(id);
    }
    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: active, updatedBy: actorId },
      include: USER_INCLUDE,
    });
    return toUserView(user);
  }

  // ─────────────── xp / badges ───────────────
  async xp(id: string) {
    await this.getOrThrow(id);
    const [entries, agg] = await this.prisma.$transaction([
      this.prisma.xpLedger.findMany({
        where: { employeeId: id },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      this.prisma.xpLedger.aggregate({
        where: { employeeId: id },
        _sum: { points: true },
      }),
    ]);
    return {
      balance: agg._sum.points ?? 0,
      entries: entries.map((e) => ({
        id: e.id,
        entryType: e.entryType,
        points: e.points,
        sourceType: e.sourceType,
        sourceId: e.sourceId,
        balanceAfter: e.balanceAfter,
        remarks: e.remarks,
        createdAt: e.createdAt,
      })),
    };
  }

  async badges(id: string) {
    await this.getOrThrow(id);
    const awards = await this.prisma.badgeAward.findMany({
      where: { employeeId: id },
      include: { badge: true },
      orderBy: { awardedAt: 'desc' },
    });
    return awards.map((a) => ({
      id: a.id,
      badgeId: a.badgeId,
      name: a.badge.name,
      iconKey: a.badge.iconKey,
      awardedAt: a.awardedAt,
      awardedMode: a.awardedMode,
    }));
  }

  // ─────────────── /me/summary (spec §A6.2) ───────────────
  async meSummary(userId: string) {
    const user = await this.getOrThrow(userId);
    const balance = await this.xpBalance(userId);
    const { level, nextLevelAt } = this.computeLevel(balance);

    const [badges, activeChallenges, pendingAcks, affordable, rank] =
      await Promise.all([
        this.badges(userId),
        this.activeChallenges(userId),
        this.pendingAcknowledgementsCount(userId, user.departmentId),
        this.affordableRewardsCount(balance),
        this.leaderboardRank(userId),
      ]);

    return {
      xpBalance: balance,
      level,
      nextLevelAt,
      badges,
      activeChallenges,
      pendingAcknowledgementsCount: pendingAcks,
      affordableRewardsCount: affordable,
      leaderboardRank: rank,
    };
  }

  private async xpBalance(userId: string): Promise<number> {
    const agg = await this.prisma.xpLedger.aggregate({
      where: { employeeId: userId },
      _sum: { points: true },
    });
    return agg._sum.points ?? 0;
  }

  private computeLevel(balance: number): {
    level: number;
    nextLevelAt: number | null;
  } {
    const thresholds = this.settings.getJson<number[]>('level_thresholds', [
      0, 100, 300, 600, 1000, 1500,
    ]);
    let idx = 0;
    for (let i = 0; i < thresholds.length; i++) {
      if (thresholds[i] <= balance) idx = i;
    }
    return { level: idx + 1, nextLevelAt: thresholds[idx + 1] ?? null };
  }

  private async activeChallenges(userId: string) {
    const joined = this.lookups.id('CHALLENGE_PARTICIPATION_STATUS', 'JOINED');
    const submitted = this.lookups.id('CHALLENGE_PARTICIPATION_STATUS', 'SUBMITTED');
    const rows = await this.prisma.challengeParticipation.findMany({
      where: { employeeId: userId, statusId: { in: [joined, submitted] } },
      include: { challenge: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({
      challengeId: r.challengeId,
      title: r.challenge.title,
      progressPct: r.progressPct,
      status: this.lookups.byIdOrNull(r.statusId)?.code ?? null,
    }));
  }

  private async pendingAcknowledgementsCount(
    userId: string,
    departmentId: string,
  ): Promise<number> {
    const published = this.lookups.id('POLICY_STATUS', 'PUBLISHED');
    const policies = await this.prisma.esgPolicy.findMany({
      where: {
        statusId: published,
        deletedAt: null,
        OR: [
          { audience: 'ALL' },
          { audience: 'DEPARTMENT', audienceDepartmentId: departmentId },
        ],
      },
      select: { id: true, version: true },
    });
    if (policies.length === 0) return 0;
    const acks = await this.prisma.policyAcknowledgement.findMany({
      where: { employeeId: userId, policyId: { in: policies.map((p) => p.id) } },
      select: { policyId: true, policyVersion: true },
    });
    const acked = new Set(acks.map((a) => `${a.policyId}:${a.policyVersion}`));
    return policies.filter((p) => !acked.has(`${p.id}:${p.version}`)).length;
  }

  private async affordableRewardsCount(balance: number): Promise<number> {
    const active = this.lookups.id('REWARD_STATUS', 'ACTIVE');
    return this.prisma.reward.count({
      where: {
        statusId: active,
        deletedAt: null,
        stock: { gt: 0 },
        pointsRequired: { lte: balance },
      },
    });
  }

  private async leaderboardRank(userId: string): Promise<number | null> {
    const sums = await this.prisma.xpLedger.groupBy({
      by: ['employeeId'],
      where: { entryType: XpEntryType.EARN },
      _sum: { points: true },
    });
    const ranked = sums
      .map((s) => ({ employeeId: s.employeeId, total: s._sum.points ?? 0 }))
      .sort((a, b) => b.total - a.total);
    const idx = ranked.findIndex((r) => r.employeeId === userId);
    return idx === -1 ? null : idx + 1;
  }

  // ─────────────── guards & helpers ───────────────
  private async getOrThrow(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!user) throw this.notFound();
    return user;
  }

  private async assertDepartment(id: string): Promise<void> {
    const dept = await this.prisma.department.findFirst({
      where: { id, deletedAt: null },
    });
    if (!dept) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'Department not found' });
    }
  }

  private async assertRoles(roleIds: string[]): Promise<void> {
    const count = await this.prisma.role.count({ where: { id: { in: roleIds } } });
    if (count !== new Set(roleIds).size) {
      throw new BadRequestException({ code: 'VALIDATION_ERROR', message: 'One or more roles not found' });
    }
  }

  private async roleIdsIncludeAdmin(roleIds: string[]): Promise<boolean> {
    const admin = await this.prisma.role.findUnique({ where: { name: ADMIN_ROLE } });
    return admin ? roleIds.includes(admin.id) : false;
  }

  /** Ensures at least one active Admin remains besides `excludeUserId`. */
  private async assertNotLastAdmin(excludeUserId: string): Promise<void> {
    const target = await this.prisma.user.findFirst({
      where: {
        id: excludeUserId,
        userRoles: { some: { role: { name: ADMIN_ROLE } } },
      },
    });
    if (!target) return; // target is not an Admin — nothing to protect

    const otherAdmins = await this.prisma.user.count({
      where: {
        id: { not: excludeUserId },
        isActive: true,
        deletedAt: null,
        userRoles: { some: { role: { name: ADMIN_ROLE } } },
      },
    });
    if (otherAdmins === 0) {
      throw new UnprocessableEntityException({
        code: 'LAST_ADMIN',
        message: 'At least one active Admin must remain',
      });
    }
  }

  private notFound(): NotFoundException {
    return new NotFoundException({ code: 'NOT_FOUND', message: 'User not found' });
  }
}
