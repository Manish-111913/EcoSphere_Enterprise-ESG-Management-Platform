import {
  Body,
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { CalculationMode } from '@prisma/client';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { SkipAudit } from '../../../common/decorators/skip-audit.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/types/authenticated-user';
import { parsePagination, PageQuery } from '../../../common/pagination';
import { CarbonService } from './carbon.service';
import { CreateCarbonTransactionDto } from './dto/carbon.dto';

@SkipAudit()
@Controller('carbon-transactions')
export class CarbonController {
  constructor(private readonly carbon: CarbonService) {}

  @RequirePermission('carbon:read')
  @Get()
  list(
    @Query() query: PageQuery,
    @Query('departmentId') departmentId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('mode') mode?: CalculationMode,
    @Query('factor') factorId?: string,
  ) {
    return this.carbon.list(parsePagination(query), {
      departmentId,
      dateFrom,
      dateTo,
      mode,
      factorId,
    });
  }

  @RequirePermission('carbon:read')
  @Get('summary')
  summary(@Query('groupBy') groupBy: 'department' | 'category' | 'month' = 'department') {
    return this.carbon.summary(groupBy);
  }

  @RequirePermission('carbon:create')
  @Post()
  create(
    @Body() dto: CreateCarbonTransactionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.carbon.createManual(dto, actor.id);
  }
}
