import { Controller, Get, Query } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { PrismaService } from '../../core/prisma/prisma.service';
import { paginate, parsePagination, PageQuery } from '../../common/pagination';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly prisma: PrismaService) {}

  @RequirePermission('audit_logs:read')
  @Get()
  async list(
    @Query() query: PageQuery & {
      actorId?: string;
      action?: string;
      entityType?: string;
      entityId?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    const p = parsePagination(query);
    const where: Prisma.AuditLogWhereInput = {};
    if (query.actorId) where.actorId = query.actorId;
    if (query.action && query.action in AuditAction) {
      where.action = query.action as AuditAction;
    }
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: p.skip,
        take: p.take,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return paginate(rows, total, p);
  }
}
