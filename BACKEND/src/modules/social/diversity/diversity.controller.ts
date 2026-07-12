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
import { DiversityService } from './diversity.service';
import {
  CreateDiversityRecordDto,
  CreateMetricDefinitionDto,
  UpdateMetricDefinitionDto,
} from './dto/diversity.dto';

@SkipAudit()
@Controller()
export class DiversityController {
  constructor(private readonly diversity: DiversityService) {}

  @RequirePermission('diversity:read')
  @Get('metric-definitions')
  listDefs() {
    return this.diversity.listMetricDefs();
  }

  @RequirePermission('diversity:create')
  @Post('metric-definitions')
  createDef(@Body() dto: CreateMetricDefinitionDto, @CurrentUser() u: AuthenticatedUser) {
    return this.diversity.createMetricDef(dto, u.id);
  }

  @RequirePermission('diversity:update')
  @Put('metric-definitions/:id')
  updateDef(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateMetricDefinitionDto, @CurrentUser() u: AuthenticatedUser) {
    return this.diversity.updateMetricDef(id, dto, u.id);
  }

  @RequirePermission('diversity:delete')
  @Delete('metric-definitions/:id')
  removeDef(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.diversity.deleteMetricDef(id, u.id);
  }

  @RequirePermission('diversity:read')
  @Get('diversity-records')
  listRecords(
    @Query('departmentId') departmentId?: string,
    @Query('metricDefinitionId') metricDefinitionId?: string,
  ) {
    return this.diversity.listRecords({ departmentId, metricDefinitionId });
  }

  @RequirePermission('diversity:create')
  @Post('diversity-records')
  createRecord(@Body() dto: CreateDiversityRecordDto, @CurrentUser() u: AuthenticatedUser) {
    return this.diversity.createRecord(dto, u.id);
  }

  @RequirePermission('diversity:read')
  @Get('diversity-records/summary')
  summary(@Query('period') period?: string) {
    return this.diversity.summary(period);
  }
}
