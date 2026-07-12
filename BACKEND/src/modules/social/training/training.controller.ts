import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { SkipAudit } from '../../../common/decorators/skip-audit.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/types/authenticated-user';
import { TrainingService } from './training.service';
import { CreateTrainingRecordDto } from './dto/training.dto';

@SkipAudit()
@Controller('training-records')
export class TrainingController {
  constructor(private readonly training: TrainingService) {}

  @RequirePermission('training:read')
  @Get()
  list(@Query('employeeId') employeeId?: string) {
    return this.training.listRecords({ employeeId });
  }

  @RequirePermission('training:read')
  @Get('summary')
  summary() {
    return this.training.summary();
  }

  @RequirePermission('training:create')
  @Post()
  create(@Body() dto: CreateTrainingRecordDto, @CurrentUser() u: AuthenticatedUser) {
    return this.training.createRecord(dto, u.id);
  }
}
