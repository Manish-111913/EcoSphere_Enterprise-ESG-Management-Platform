import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { SkipAudit } from '../../../common/decorators/skip-audit.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/types/authenticated-user';
import { parsePagination, PageQuery } from '../../../common/pagination';
import { ChallengesService } from './challenges.service';
import {
  ChallengeDecisionDto,
  ChallengeProofDto,
  ChallengeRejectDto,
  CreateChallengeDto,
  ProgressDto,
  TransitionDto,
  UpdateChallengeDto,
} from './dto/challenge.dto';

@SkipAudit()
@Controller('challenges')
export class ChallengesController {
  constructor(private readonly challenges: ChallengesService) {}

  @RequirePermission('challenges:read')
  @Get()
  list(
    @Query() query: PageQuery,
    @Query('statusId') statusId?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.challenges.list(parsePagination(query), { statusId, categoryId });
  }

  @RequirePermission('challenges:read')
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.challenges.get(id);
  }

  @RequirePermission('challenges:read')
  @Get(':id/participations')
  participations(@Param('id', ParseUUIDPipe) id: string, @Query() query: PageQuery) {
    return this.challenges.listParticipations(id, parsePagination(query));
  }

  @RequirePermission('challenges:create')
  @Post()
  create(@Body() dto: CreateChallengeDto, @CurrentUser() u: AuthenticatedUser) {
    return this.challenges.create(dto, u.id);
  }

  @RequirePermission('challenges:update')
  @Put(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateChallengeDto, @CurrentUser() u: AuthenticatedUser) {
    return this.challenges.update(id, dto, u.id);
  }

  @RequirePermission('challenges:transition')
  @Post(':id/transition')
  transition(@Param('id', ParseUUIDPipe) id: string, @Body() dto: TransitionDto, @CurrentUser() u: AuthenticatedUser) {
    return this.challenges.transition(id, dto.toStatus, u);
  }

  @RequirePermission('challenge_participations:create')
  @Post(':id/join')
  join(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.challenges.join(id, u);
  }
}

@SkipAudit()
@Controller('challenge-participations')
export class ChallengeParticipationsController {
  constructor(private readonly challenges: ChallengesService) {}

  @RequirePermission('challenge_participations:create')
  @Post(':id/progress')
  progress(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ProgressDto, @CurrentUser() u: AuthenticatedUser) {
    return this.challenges.setProgress(id, dto.progressPct, u);
  }

  @RequirePermission('challenge_participations:create')
  @Post(':id/proof')
  proof(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ChallengeProofDto, @CurrentUser() u: AuthenticatedUser) {
    return this.challenges.attachProof(id, dto.attachmentId, u);
  }

  @RequirePermission('challenge_participations:create')
  @Post(':id/submit')
  submit(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.challenges.submit(id, u);
  }

  @RequirePermission('challenge_participations:approve')
  @Post(':id/approve')
  approve(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ChallengeDecisionDto, @CurrentUser() u: AuthenticatedUser) {
    return this.challenges.approve(id, dto.remarks, u);
  }

  @RequirePermission('challenge_participations:reject')
  @Post(':id/reject')
  reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ChallengeRejectDto, @CurrentUser() u: AuthenticatedUser) {
    return this.challenges.reject(id, dto.remarks, u);
  }

  @RequirePermission('challenge_participations:withdraw')
  @Post(':id/withdraw')
  withdraw(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.challenges.withdraw(id, u);
  }
}
