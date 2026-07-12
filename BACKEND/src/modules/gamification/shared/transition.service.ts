import {
  ForbiddenException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AuthenticatedUser } from '../../../common/types/authenticated-user';

/**
 * Data-driven state machine (spec §A3.2): a transition is legal only if a
 * lookup_transitions edge exists, and the caller holds its allowed_permission.
 */
@Injectable()
export class TransitionService {
  constructor(private readonly prisma: PrismaService) {}

  async assertAllowed(
    fromValueId: string,
    toValueId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    const edge = await this.prisma.lookupTransition.findFirst({
      where: { fromValueId, toValueId },
    });
    if (!edge) {
      throw new UnprocessableEntityException({
        code: 'INVALID_TRANSITION',
        message: 'This status transition is not allowed',
      });
    }
    if (
      edge.allowedPermission &&
      !user.permissions.includes(edge.allowedPermission) &&
      !user.roleNames.includes('Admin')
    ) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: `Missing permission for transition: ${edge.allowedPermission}`,
      });
    }
  }
}
