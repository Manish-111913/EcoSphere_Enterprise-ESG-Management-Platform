import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { ReportsService } from './reports.service';
import {
  CreateTemplateDto,
  CustomReportDto,
  ExportReportDto,
  ReportFiltersDto,
} from './dto/report.dto';

@SkipAudit()
@Controller()
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @RequirePermission('reports:read')
  @Get('reports/environmental')
  environmental(@Query() f: ReportFiltersDto, @CurrentUser() u: AuthenticatedUser) {
    return this.reports.environmental(f, u);
  }

  @RequirePermission('reports:read')
  @Get('reports/social')
  social(@Query() f: ReportFiltersDto, @CurrentUser() u: AuthenticatedUser) {
    return this.reports.social(f, u);
  }

  @RequirePermission('reports:read')
  @Get('reports/governance')
  governance(@Query() f: ReportFiltersDto, @CurrentUser() u: AuthenticatedUser) {
    return this.reports.governance(f, u);
  }

  @RequirePermission('reports:read')
  @Get('reports/summary')
  summary(@Query() f: ReportFiltersDto, @CurrentUser() u: AuthenticatedUser) {
    return this.reports.summary(f, u);
  }

  @RequirePermission('reports:create')
  @Post('reports/custom')
  custom(@Body() dto: CustomReportDto, @CurrentUser() u: AuthenticatedUser) {
    return this.reports.custom(dto, u);
  }

  // report templates
  @RequirePermission('reports:read')
  @Get('report-templates')
  listTemplates(@CurrentUser() u: AuthenticatedUser) {
    return this.reports.listTemplates(u.id);
  }

  @RequirePermission('reports:create')
  @Post('report-templates')
  createTemplate(@Body() dto: CreateTemplateDto, @CurrentUser() u: AuthenticatedUser) {
    return this.reports.createTemplate(dto, u.id);
  }

  @RequirePermission('reports:create')
  @Delete('report-templates/:id')
  deleteTemplate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() u: AuthenticatedUser) {
    return this.reports.deleteTemplate(id, u.id);
  }

  // export
  @RequirePermission('reports:export')
  @Post('reports/export')
  async export(
    @Body() dto: ExportReportDto,
    @CurrentUser() u: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, mimeType, filename, exportId } = await this.reports.export(
      dto.report,
      dto.format,
      dto.filters ?? {},
      u,
    );
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('X-Export-Id', exportId);
    res.send(buffer);
  }

  @RequirePermission('reports:read')
  @Get('report-exports/:id')
  getExport(@Param('id', ParseUUIDPipe) id: string) {
    return this.reports.getExport(id);
  }
}
