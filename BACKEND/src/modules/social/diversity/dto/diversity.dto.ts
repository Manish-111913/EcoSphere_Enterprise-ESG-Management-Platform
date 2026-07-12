import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

const DIRECTIONS = ['higher_better', 'lower_better'] as const;

export class CreateMetricDefinitionDto {
  @IsString() @IsNotEmpty() code!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsString() unit?: string;
  @IsIn(DIRECTIONS) direction!: (typeof DIRECTIONS)[number];
  @IsOptional() isActive?: boolean;
}

export class UpdateMetricDefinitionDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsIn(DIRECTIONS) direction?: (typeof DIRECTIONS)[number];
  @IsOptional() isActive?: boolean;
}

export class CreateDiversityRecordDto {
  @IsOptional() @IsUUID() departmentId?: string;
  @IsUUID() metricDefinitionId!: string;
  @IsDateString() period!: string;
  @IsNumber() value!: number;
  @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}
