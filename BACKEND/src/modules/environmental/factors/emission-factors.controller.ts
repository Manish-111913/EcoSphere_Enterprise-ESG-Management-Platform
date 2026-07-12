import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseBoolPipe,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { SkipAudit } from '../../../common/decorators/skip-audit.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/types/authenticated-user';
import { EmissionFactorsService } from './emission-factors.service';
import {
  CreateEmissionFactorDto,
  UpdateEmissionFactorDto,
} from './dto/emission-factor.dto';

@SkipAudit()
@Controller('emission-factors')
export class EmissionFactorsController {
  constructor(private readonly factors: EmissionFactorsService) {}

  @RequirePermission('emission_factors:read')
  @Get()
  list(
    @Query('category') category?: string,
    @Query('isActive', new ParseBoolPipe({ optional: true })) isActive?: boolean,
  ) {
    return this.factors.list({ category, isActive });
  }

  @RequirePermission('emission_factors:read')
  @Get('active')
  active(
    @Query('category') category: string,
    @Query('unit', ParseUUIDPipe) unit: string,
    @Query('date') date?: string,
  ) {
    return this.factors.resolveActive(category, unit, date);
  }

  @RequirePermission('emission_factors:read')
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.factors.get(id);
  }

  @RequirePermission('emission_factors:create')
  @Post()
  create(
    @Body() dto: CreateEmissionFactorDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.factors.create(dto, actor.id);
  }

  @RequirePermission('emission_factors:update')
  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmissionFactorDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.factors.update(id, dto, actor.id);
  }

  @RequirePermission('emission_factors:delete')
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.factors.remove(id, actor.id);
  }
}
