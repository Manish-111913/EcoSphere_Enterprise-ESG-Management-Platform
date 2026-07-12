import { Injectable } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AuditService } from '../../../core/audit/audit.service';
import { LookupService } from '../../../core/lookups/lookup.service';
import { CreateTrainingRecordDto } from './dto/training.dto';

@Injectable()
export class TrainingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly lookups: LookupService,
  ) {}

  listRecords(filters: { employeeId?: string }) {
    const where: Prisma.TrainingRecordWhereInput = {};
    if (filters.employeeId) where.employeeId = filters.employeeId;
    return this.prisma.trainingRecord.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async createRecord(dto: CreateTrainingRecordDto, actorId: string) {
    const record = await this.prisma.trainingRecord.create({
      data: {
        employeeId: dto.employeeId,
        trainingName: dto.trainingName,
        completedAt: dto.completedAt ? new Date(dto.completedAt) : null,
        hours: dto.hours,
        statusId: dto.statusId ?? this.lookups.id('TRAINING_STATUS', dto.completedAt ? 'COMPLETED' : 'NOT_STARTED'),
      },
    });
    await this.audit.record({ actorId, action: AuditAction.CREATE, entityType: 'training_record', entityId: record.id, after: record });
    return record;
  }

  /** Completion % by department (spec §A6.5) — feeds Social pillar. */
  async summary() {
    return this.prisma.$queryRaw<
      { departmentId: string; name: string; employees: number; completed: number; completionPct: number }[]
    >(Prisma.sql`
      SELECT d.id AS "departmentId", d.name AS name,
             COUNT(DISTINCT u.id)::int AS employees,
             COUNT(DISTINCT t.employee_id) FILTER (WHERE t.completed_at IS NOT NULL)::int AS completed,
             ROUND(
               100.0 * COUNT(DISTINCT t.employee_id) FILTER (WHERE t.completed_at IS NOT NULL)
               / NULLIF(COUNT(DISTINCT u.id), 0), 1
             )::float AS "completionPct"
      FROM departments d
      LEFT JOIN users u ON u.department_id = d.id AND u.deleted_at IS NULL AND u.is_active = true
      LEFT JOIN training_records t ON t.employee_id = u.id
      WHERE d.deleted_at IS NULL
      GROUP BY d.id, d.name
      ORDER BY d.name`);
  }
}
