import {
  ForbiddenException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ApprovalEntityType } from '@prisma/client';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AuthenticatedUser } from '../../../common/types/authenticated-user';

const ADMIN_ROLE = 'Admin';

/**
 * W2 approver resolution (spec §A6.5/§A9): the approver must satisfy an active
 * approval_rule for the entity — role match + scope (ANY | SAME_DEPARTMENT) —
 * and must never be the participant.
 */
@Injectable()
export class ApprovalPolicyService {
  constructor(private readonly prisma: PrismaService) {}

  async assertCanApprove(
    entityType: ApprovalEntityType,
    approver: AuthenticatedUser,
    participantEmployeeId: string,
    participantDepartmentId: string,
  ): Promise<void> {
    if (approver.id === participantEmployeeId) {
      throw new UnprocessableEntityException({
        code: 'BUSINESS_RULE',
        message: 'You cannot approve your own submission',
      });
    }
    if (approver.roleNames.includes(ADMIN_ROLE)) return;

    const rules = await this.prisma.approvalRule.findMany({
      where: { entityType, isActive: true },
    });
    const allowed = rules.some(
      (r) =>
        approver.roleIds.includes(r.approverRoleId) &&
        (r.scope === 'ANY' ||
          (r.scope === 'SAME_DEPARTMENT' &&
            approver.departmentId === participantDepartmentId)),
    );
    if (!allowed) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'You are not authorized to approve this item',
      });
    }
  }
}
