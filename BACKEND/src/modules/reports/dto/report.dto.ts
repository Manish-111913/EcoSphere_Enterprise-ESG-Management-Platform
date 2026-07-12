import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class ReportFiltersDto {
  @IsOptional() @IsUUID() department?: string;
  @IsOptional() @IsString() dateFrom?: string;
  @IsOptional() @IsString() dateTo?: string;
  @IsOptional() @IsString() module?: string;
  @IsOptional() @IsUUID() employee?: string;
  @IsOptional() @IsUUID() challenge?: string;
  @IsOptional() @IsString() esgCategory?: string;
}

export const CUSTOM_MODULES = ['carbon', 'csr', 'issues', 'challenges'] as const;

export class CustomReportDto {
  @IsIn(CUSTOM_MODULES) moduleScope!: (typeof CUSTOM_MODULES)[number];
  @IsArray() @IsString({ each: true }) columns!: string[];
  @IsOptional() @IsObject() filters?: Record<string, unknown>;
  @IsOptional() @IsString() groupBy?: string;
  @IsOptional() @IsIn(['count', 'sum']) aggregation?: 'count' | 'sum';
  @IsOptional() @IsString() aggregateField?: string;
}

export const EXPORT_FORMATS = ['csv', 'xlsx', 'pdf'] as const;

export class ExportReportDto {
  @IsIn(['environmental', 'social', 'governance', 'summary']) report!: string;
  @IsIn(EXPORT_FORMATS) format!: (typeof EXPORT_FORMATS)[number];
  @IsOptional() @IsObject() filters?: ReportFiltersDto;
}

export class CreateTemplateDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsObject() moduleScope!: Record<string, unknown>;
  @IsArray() columns!: unknown[];
  @IsOptional() @IsObject() filters?: Record<string, unknown>;
  @IsOptional() @IsArray() groupBy?: unknown[];
  @IsOptional() @IsObject() aggregations?: Record<string, unknown>;
  @IsOptional() @IsString() chartType?: string;
  @IsOptional() isShared?: boolean;
}
