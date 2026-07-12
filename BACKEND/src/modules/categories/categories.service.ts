import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuditAction, Category, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import {
  CategoryType,
  CreateCategoryDto,
  UpdateCategoryDto,
} from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(type?: CategoryType): Promise<Category[]> {
    const where: Prisma.CategoryWhereInput = { deletedAt: null };
    if (type) where.type = type;
    return this.prisma.category.findMany({ where, orderBy: { name: 'asc' } });
  }

  async get(id: string): Promise<Category> {
    return this.getOrThrow(id);
  }

  /** Reference counts for a category (spec §A6.3 GET /:id/usage). */
  async usage(id: string): Promise<{ count: number; entities: Record<string, number> }> {
    const cat = await this.getOrThrow(id);
    const entities: Record<string, number> =
      cat.type === 'CSR_ACTIVITY'
        ? { csrActivities: await this.prisma.csrActivity.count({ where: { categoryId: id } }) }
        : { challenges: await this.prisma.challenge.count({ where: { categoryId: id } }) };
    const count = Object.values(entities).reduce((a, b) => a + b, 0);
    return { count, entities };
  }

  async create(dto: CreateCategoryDto, actorId: string): Promise<Category> {
    const dup = await this.prisma.category.findFirst({
      where: { name: dto.name, type: dto.type, deletedAt: null },
    });
    if (dup) {
      throw new ConflictException({ code: 'CONFLICT', message: 'Category already exists for this type' });
    }
    const cat = await this.prisma.category.create({
      data: {
        name: dto.name,
        type: dto.type,
        description: dto.description,
        isActive: dto.isActive ?? true,
      },
    });
    await this.audit.record({
      actorId,
      action: AuditAction.CREATE,
      entityType: 'category',
      entityId: cat.id,
      after: cat,
    });
    return cat;
  }

  async update(
    id: string,
    dto: UpdateCategoryDto,
    actorId: string,
  ): Promise<Category> {
    const before = await this.getOrThrow(id);
    if (dto.name && dto.name !== before.name) {
      const dup = await this.prisma.category.findFirst({
        where: { name: dto.name, type: before.type, deletedAt: null, id: { not: id } },
      });
      if (dup) {
        throw new ConflictException({ code: 'CONFLICT', message: 'Category already exists for this type' });
      }
    }
    const after = await this.prisma.category.update({ where: { id }, data: dto });
    await this.audit.record({
      actorId,
      action: AuditAction.UPDATE,
      entityType: 'category',
      entityId: id,
      before,
      after,
    });
    return after;
  }

  async remove(id: string, actorId: string): Promise<{ message: string }> {
    const before = await this.getOrThrow(id);
    const { count } = await this.usage(id);
    if (count > 0) {
      throw new UnprocessableEntityException({
        code: 'CATEGORY_IN_USE',
        message: 'Category is referenced by existing records; deactivate instead',
        details: { references: count },
      });
    }
    await this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await this.audit.record({
      actorId,
      action: AuditAction.DELETE,
      entityType: 'category',
      entityId: id,
      before,
    });
    return { message: 'Category deleted' };
  }

  private async getOrThrow(id: string): Promise<Category> {
    const cat = await this.prisma.category.findFirst({
      where: { id, deletedAt: null },
    });
    if (!cat) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Category not found' });
    }
    return cat;
  }
}
