import {
  IsDateString,
  IsIn,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateCarbonTransactionDto {
  @IsUUID()
  departmentId!: string;

  @IsUUID()
  emissionFactorId!: string;

  @IsPositive()
  quantity!: number;

  @IsUUID()
  unitId!: string;

  @IsDateString()
  occurredAt!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CarbonSummaryQuery {
  @IsIn(['department', 'category', 'month'])
  groupBy!: 'department' | 'category' | 'month';
}
