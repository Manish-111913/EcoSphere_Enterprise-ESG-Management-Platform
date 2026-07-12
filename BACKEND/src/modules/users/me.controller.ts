import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { UsersService } from './users.service';

/** Self-service endpoints (spec §A6.2: GET /me/summary). */
@Controller('me')
export class MeController {
  constructor(private readonly users: UsersService) {}

  @Get('summary')
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.users.meSummary(user.id);
  }

  @Get('xp')
  xp(@CurrentUser() user: AuthenticatedUser) {
    return this.users.xp(user.id);
  }

  @Get('badges')
  badges(@CurrentUser() user: AuthenticatedUser) {
    return this.users.badges(user.id);
  }
}
