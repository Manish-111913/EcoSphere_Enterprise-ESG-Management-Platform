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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RecordType } from '@prisma/client';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { SkipAudit } from '../../../common/decorators/skip-audit.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/types/authenticated-user';
import { parsePagination, PageQuery } from '../../../common/pagination';
import { OperationalRecordsService } from './operational-records.service';
import {
  CreateOperationalRecordDto,
  UpdateOperationalRecordDto,
} from './dto/operational-record.dto';

@SkipAudit()
@Controller('operational-records')
export class OperationalRecordsController {
  constructor(private readonly records: OperationalRecordsService) {}

  @RequirePermission('operational_records:read')
  @Get()
  list(
    @Query() query: PageQuery,
    @Query('recordType') recordType?: RecordType,
    @Query('departmentId') departmentId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.records.list(parsePagination(query), {
      recordType,
      departmentId,
      dateFrom,
      dateTo,
    });
  }

  @RequirePermission('operational_records:import')
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  import(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.records.importCsv(file, actor.id);
  }

  @RequirePermission('operational_records:read')
  @Get(':id')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.records.get(id);
  }

  @RequirePermission('operational_records:create')
  @Post()
  create(
    @Body() dto: CreateOperationalRecordDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.records.create(dto, actor.id);
  }

  @RequirePermission('operational_records:calculate')
  @Post(':id/calculate')
  calculate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.records.calculate(id, actor.id);
  }

  @RequirePermission('operational_records:update')
  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOperationalRecordDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.records.update(id, dto, actor.id);
  }

  @RequirePermission('operational_records:delete')
  @Delete(':id')
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.records.remove(id, actor.id);
  }
}
