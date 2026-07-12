import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuditAction, Department, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import {
  paginate,
  Paginated,
  Pagination,
} from '../../common/pagination';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';

export interface DeptTreeNode extends Department {
  children: DeptTreeNode[];
}

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(
    p: Pagination,
    filters: { isActive?: boolean },
  ): Promise<Paginated<Department>> {
    const where: Prisma.DepartmentWhereInput = { deletedAt: null };
    if (filters.isActive !== undefined) where.isActive = filters.isActive;
    if (p.search) {
      where.OR = [
        { name: { contains: p.search, mode: 'insensitive' } },
        { code: { contains: p.search, mode: 'insensitive' } },
      ];
    }
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.department.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: p.skip,
        take: p.take,
      }),
      this.prisma.department.count({ where }),
    ]);
    return paginate(rows, total, p);
  }

  async tree(): Promise<DeptTreeNode[]> {
    const all = await this.prisma.department.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
    });
    const byId = new Map<string, DeptTreeNode>();
    all.forEach((d) => byId.set(d.id, { ...d, children: [] }));
    const roots: DeptTreeNode[] = [];
    for (const node of byId.values()) {
      if (node.parentDepartmentId && byId.has(node.parentDepartmentId)) {
        byId.get(node.parentDepartmentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  async get(id: string): Promise<Department> {
    return this.getOrThrow(id);
  }

  async scores(id: string) {
    await this.getOrThrow(id);
    // Stored department_scores (populated by the scoring engine), freshest first.
    return this.prisma.departmentScore.findMany({
      where: { departmentId: id },
      orderBy: { computedAt: 'desc' },
    });
  }

  async create(
    dto: CreateDepartmentDto,
    actorId: string,
  ): Promise<Department> {
    await this.assertCodeFree(dto.code);
    if (dto.parentDepartmentId) await this.getOrThrow(dto.parentDepartmentId);
    if (dto.headUserId) await this.assertActiveUser(dto.headUserId);

    const dept = await this.prisma.department.create({
      data: {
        name: dto.name,
        code: dto.code,
        headUserId: dto.headUserId ?? null,
        parentDepartmentId: dto.parentDepartmentId ?? null,
        isActive: dto.isActive ?? true,
        createdBy: actorId,
      },
    });
    await this.audit.record({
      actorId,
      action: AuditAction.CREATE,
      entityType: 'department',
      entityId: dept.id,
      after: dept,
    });
    return dept;
  }

  async update(
    id: string,
    dto: UpdateDepartmentDto,
    actorId: string,
  ): Promise<Department> {
    const before = await this.getOrThrow(id);
    if (dto.code && dto.code !== before.code) await this.assertCodeFree(dto.code);
    if (dto.headUserId) await this.assertActiveUser(dto.headUserId);
    if (dto.parentDepartmentId !== undefined && dto.parentDepartmentId !== null) {
      await this.getOrThrow(dto.parentDepartmentId);
      await this.assertNoCycle(id, dto.parentDepartmentId);
    }

    const after = await this.prisma.department.update({
      where: { id },
      data: { ...dto, updatedBy: actorId },
    });
    await this.audit.record({
      actorId,
      action: AuditAction.UPDATE,
      entityType: 'department',
      entityId: id,
      before,
      after,
    });
    return after;
  }

  async remove(id: string, actorId: string): Promise<{ message: string }> {
    const before = await this.getOrThrow(id);
    await this.assertNotInUse(id);
    await this.prisma.department.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedBy: actorId },
    });
    await this.audit.record({
      actorId,
      action: AuditAction.DELETE,
      entityType: 'department',
      entityId: id,
      before,
    });
    return { message: 'Department deleted' };
  }

  // ─────────────── guards ───────────────
  private async getOrThrow(id: string): Promise<Department> {
    const dept = await this.prisma.department.findFirst({
      where: { id, deletedAt: null },
    });
    if (!dept) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Department not found' });
    }
    return dept;
  }

  private async assertCodeFree(code: string): Promise<void> {
    const existing = await this.prisma.department.findFirst({
      where: { code, deletedAt: null },
    });
    if (existing) {
      throw new ConflictException({ code: 'CONFLICT', message: 'Department code already exists' });
    }
  }

  private async assertActiveUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, isActive: true, deletedAt: null },
    });
    if (!user) {
      throw new UnprocessableEntityException({
        code: 'BUSINESS_RULE',
        message: 'Department head must be an active user',
      });
    }
  }

  /** Walk ancestors of `newParent`; if we reach `id`, the move creates a cycle. */
  private async assertNoCycle(id: string, newParentId: string): Promise<void> {
    if (newParentId === id) {
      throw new UnprocessableEntityException({
        code: 'DEPARTMENT_CYCLE',
        message: 'A department cannot be its own parent',
      });
    }
    let cursor: string | null = newParentId;
    const seen = new Set<string>();
    while (cursor) {
      if (cursor === id) {
        throw new UnprocessableEntityException({
          code: 'DEPARTMENT_CYCLE',
          message: 'Parent assignment would create a cycle',
        });
      }
      if (seen.has(cursor)) break;
      seen.add(cursor);
      const parent: { parentDepartmentId: string | null } | null =
        await this.prisma.department.findUnique({
          where: { id: cursor },
          select: { parentDepartmentId: true },
        });
      cursor = parent?.parentDepartmentId ?? null;
    }
  }

  private async assertNotInUse(id: string): Promise<void> {
    const [users, children, opRecords, carbon, csr, goals, scores, diversity] =
      await this.prisma.$transaction([
        this.prisma.user.count({ where: { departmentId: id, deletedAt: null } }),
        this.prisma.department.count({ where: { parentDepartmentId: id, deletedAt: null } }),
        this.prisma.operationalRecord.count({ where: { departmentId: id } }),
        this.prisma.carbonTransaction.count({ where: { departmentId: id } }),
        this.prisma.csrActivity.count({ where: { departmentId: id } }),
        this.prisma.environmentalGoal.count({ where: { departmentId: id } }),
        this.prisma.departmentScore.count({ where: { departmentId: id } }),
        this.prisma.diversityMetricRecord.count({ where: { departmentId: id } }),
      ]);
    const total =
      users + children + opRecords + carbon + csr + goals + scores + diversity;
    if (total > 0) {
      throw new UnprocessableEntityException({
        code: 'DEPARTMENT_IN_USE',
        message: 'Department is referenced by existing records; deactivate instead',
        details: { users, children, operationalRecords: opRecords, carbonTransactions: carbon, csrActivities: csr, goals, scores, diversity },
      });
    }
  }
}
