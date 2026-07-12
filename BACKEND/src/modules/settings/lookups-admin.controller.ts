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
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { LookupsAdminService } from './lookups-admin.service';
import {
  CreateLookupTypeDto,
  CreateLookupValueDto,
  CreateTransitionDto,
  UpdateLookupValueDto,
} from './dto/lookup.dto';

@SkipAudit()
@Controller()
export class LookupsAdminController {
  constructor(private readonly lookups: LookupsAdminService) {}

  // Reference data — readable by any authenticated user (forms need units,
  // scopes, severities, statuses, etc.). Writes remain permission-gated.
  @Get('lookups')
  listTypes() {
    return this.lookups.listTypes();
  }

  @RequirePermission('lookups:create')
  @Post('lookups')
  createType(
    @Body() dto: CreateLookupTypeDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.lookups.createType(dto, actor.id);
  }

  @RequirePermission('lookups:create')
  @Post('lookup-values')
  createValue(
    @Body() dto: CreateLookupValueDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.lookups.createValue(dto, actor.id);
  }

  @RequirePermission('lookups:update')
  @Put('lookup-values/:id')
  updateValue(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLookupValueDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.lookups.updateValue(id, dto, actor.id);
  }

  @RequirePermission('lookups:delete')
  @Delete('lookup-values/:id')
  deleteValue(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.lookups.deleteValue(id, actor.id);
  }

  @Get('lookup-transitions')
  listTransitions(@Query('lookupTypeId') lookupTypeId?: string) {
    return this.lookups.listTransitions(lookupTypeId);
  }

  @RequirePermission('lookups:create')
  @Post('lookup-transitions')
  createTransition(
    @Body() dto: CreateTransitionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.lookups.createTransition(dto, actor.id);
  }

  @RequirePermission('lookups:delete')
  @Delete('lookup-transitions/:id')
  deleteTransition(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.lookups.deleteTransition(id, actor.id);
  }
}
