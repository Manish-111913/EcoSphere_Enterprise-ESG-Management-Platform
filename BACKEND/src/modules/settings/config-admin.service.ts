import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { EventBus } from '../../core/events/event-bus';
import { CONFIG_UPDATED_EVENT } from '../../core/config/app-config.service';
import {
  CreateApprovalRuleDto,
  CreateDashboardConfigDto,
  CreateEsgWeightsDto,
  UpdateApprovalRuleDto,
  UpdateDashboardConfigDto,
  UpdateScoringConfigsDto,
} from './dto/config-admin.dto';

@Injectable()
export class ConfigAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly events: EventBus,
  ) {}

  // ─────────────── ESG weights ───────────────
  listWeights() {
    return this.prisma.esgWeightConfig.findMany({
      orderBy: { effectiveFrom: 'desc' },
    });
  }

  async createWeights(dto: CreateEsgWeightsDto, actorId: string) {
    const sum = dto.environmentalWeight + dto.socialWeight + dto.governanceWeight;
    if (sum !== 100) {
      throw new UnprocessableEntityException({
        code: 'WEIGHTS_NOT_100',
        message: `E+S+G must equal 100 (got ${sum})`,
      });
    }
    const effectiveFrom = dto.effectiveFrom ? new Date(dto.effectiveFrom) : new Date();
    const created = await this.prisma.$transaction(async (tx) => {
      await tx.esgWeightConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false, effectiveTo: effectiveFrom },
      });
      return tx.esgWeightConfig.create({
        data: {
          environmentalWeight: dto.environmentalWeight,
          socialWeight: dto.socialWeight,
          governanceWeight: dto.governanceWeight,
          effectiveFrom,
          isActive: true,
        },
      });
    });
    await this.audit.record({
      actorId,
      action: AuditAction.CONFIG_CHANGE,
      entityType: 'esg_weight_config',
      entityId: created.id,
      after: created,
    });
    this.bust();
    return created;
  }

  // ─────────────── scoring configs ───────────────
  listScoringConfigs() {
    return this.prisma.scoringConfig.findMany({
      orderBy: [{ pillar: 'asc' }, { metricCode: 'asc' }],
    });
  }

  async updateScoringConfigs(dto: UpdateScoringConfigsDto, actorId: string) {
    const before = await this.prisma.scoringConfig.findMany();
    const byId = new Map(before.map((c) => [c.id, c]));
    for (const item of dto.configs) {
      if (!byId.has(item.id)) {
        throw new NotFoundException({ code: 'NOT_FOUND', message: `Scoring config ${item.id} not found` });
      }
    }
    // Validate each pillar's active weights still sum to 100 after the change.
    const projected = before.map((c) => {
      const upd = dto.configs.find((x) => x.id === c.id);
      return {
        pillar: c.pillar,
        weight: upd ? upd.weight : c.weight,
        isActive: upd?.isActive ?? c.isActive,
      };
    });
    const sums = new Map<string, number>();
    for (const c of projected) {
      if (c.isActive) sums.set(c.pillar, (sums.get(c.pillar) ?? 0) + c.weight);
    }
    for (const [pillar, sum] of sums) {
      if (sum !== 100) {
        throw new UnprocessableEntityException({
          code: 'WEIGHTS_NOT_100',
          message: `Pillar ${pillar} metric weights must sum to 100 (got ${sum})`,
        });
      }
    }

    await this.prisma.$transaction(
      dto.configs.map((item) =>
        this.prisma.scoringConfig.update({
          where: { id: item.id },
          data: {
            weight: item.weight,
            isActive: item.isActive,
            normalization: (item.normalization as Prisma.InputJsonValue) ?? undefined,
          },
        }),
      ),
    );
    const after = await this.prisma.scoringConfig.findMany();
    await this.audit.record({
      actorId,
      action: AuditAction.CONFIG_CHANGE,
      entityType: 'scoring_config',
      entityId: 'bulk',
      before,
      after,
    });
    this.bust();
    return after;
  }

  // ─────────────── approval rules ───────────────
  listApprovalRules() {
    return this.prisma.approvalRule.findMany({ orderBy: { createdAt: 'asc' } });
  }

  async createApprovalRule(dto: CreateApprovalRuleDto, actorId: string) {
    await this.assertRole(dto.approverRoleId);
    const rule = await this.prisma.approvalRule.create({
      data: {
        entityType: dto.entityType,
        approverRoleId: dto.approverRoleId,
        scope: dto.scope ?? 'ANY',
        evidenceRequiredOverride: dto.evidenceRequiredOverride,
        isActive: dto.isActive ?? true,
      },
    });
    await this.audit.record({ actorId, action: AuditAction.CONFIG_CHANGE, entityType: 'approval_rule', entityId: rule.id, after: rule });
    this.bust();
    return rule;
  }

  async updateApprovalRule(id: string, dto: UpdateApprovalRuleDto, actorId: string) {
    const before = await this.prisma.approvalRule.findUnique({ where: { id } });
    if (!before) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Approval rule not found' });
    if (dto.approverRoleId) await this.assertRole(dto.approverRoleId);
    const after = await this.prisma.approvalRule.update({ where: { id }, data: dto });
    await this.audit.record({ actorId, action: AuditAction.CONFIG_CHANGE, entityType: 'approval_rule', entityId: id, before, after });
    this.bust();
    return after;
  }

  async deleteApprovalRule(id: string, actorId: string) {
    const before = await this.prisma.approvalRule.findUnique({ where: { id } });
    if (!before) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Approval rule not found' });
    await this.prisma.approvalRule.delete({ where: { id } });
    await this.audit.record({ actorId, action: AuditAction.CONFIG_CHANGE, entityType: 'approval_rule', entityId: id, before, after: null });
    this.bust();
    return { message: 'Approval rule deleted' };
  }

  // ─────────────── dashboard widget configs ───────────────
  listDashboardConfigs(roleId?: string) {
    return this.prisma.dashboardWidgetConfig.findMany({
      where: roleId ? { roleId } : {},
      orderBy: [{ roleId: 'asc' }, { position: 'asc' }],
    });
  }

  async createDashboardConfig(dto: CreateDashboardConfigDto, actorId: string) {
    await this.assertRole(dto.roleId);
    const existing = await this.prisma.dashboardWidgetConfig.findFirst({
      where: { roleId: dto.roleId, widgetCode: dto.widgetCode },
    });
    if (existing) {
      throw new UnprocessableEntityException({ code: 'CONFLICT', message: 'Widget already configured for role' });
    }
    const cfg = await this.prisma.dashboardWidgetConfig.create({
      data: {
        roleId: dto.roleId,
        widgetCode: dto.widgetCode,
        position: dto.position ?? 0,
        isVisible: dto.isVisible ?? true,
        config: (dto.config as Prisma.InputJsonValue) ?? undefined,
      },
    });
    await this.audit.record({ actorId, action: AuditAction.CONFIG_CHANGE, entityType: 'dashboard_widget_config', entityId: cfg.id, after: cfg });
    this.bust();
    return cfg;
  }

  async updateDashboardConfig(id: string, dto: UpdateDashboardConfigDto, actorId: string) {
    const before = await this.prisma.dashboardWidgetConfig.findUnique({ where: { id } });
    if (!before) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Dashboard config not found' });
    const after = await this.prisma.dashboardWidgetConfig.update({
      where: { id },
      data: {
        position: dto.position,
        isVisible: dto.isVisible,
        config: (dto.config as Prisma.InputJsonValue) ?? undefined,
      },
    });
    await this.audit.record({ actorId, action: AuditAction.CONFIG_CHANGE, entityType: 'dashboard_widget_config', entityId: id, before, after });
    this.bust();
    return after;
  }

  async deleteDashboardConfig(id: string, actorId: string) {
    const before = await this.prisma.dashboardWidgetConfig.findUnique({ where: { id } });
    if (!before) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Dashboard config not found' });
    await this.prisma.dashboardWidgetConfig.delete({ where: { id } });
    await this.audit.record({ actorId, action: AuditAction.CONFIG_CHANGE, entityType: 'dashboard_widget_config', entityId: id, before, after: null });
    this.bust();
    return { message: 'Dashboard config deleted' };
  }

  // ─────────────── helpers ───────────────
  private async assertRole(roleId: string): Promise<void> {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      throw new UnprocessableEntityException({ code: 'BUSINESS_RULE', message: 'Role not found' });
    }
  }

  private bust(): void {
    this.events.publish(CONFIG_UPDATED_EVENT, { scope: 'config' });
  }
}
