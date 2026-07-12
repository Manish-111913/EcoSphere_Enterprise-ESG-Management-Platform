import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export const RECORD_TYPES = ['PURCHASE', 'MANUFACTURING', 'EXPENSE', 'FLEET'] as const;
export type RecordTypeLiteral = (typeof RECORD_TYPES)[number];

export class CreateOperationalRecordDto {
  @IsIn(RECORD_TYPES)
  recordType!: RecordTypeLiteral;

  @IsUUID()
  departmentId!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsPositive()
  quantity!: number;

  @IsUUID()
  unitId!: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsDateString()
  occurredAt!: string;

  @IsOptional()
  @IsString()
  externalRef?: string;

  @IsOptional()
  @IsString()
  emissionCategory?: string;
}

export class UpdateOperationalRecordDto {
  @IsOptional() @IsIn(RECORD_TYPES) recordType?: RecordTypeLiteral;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsPositive() quantity?: number;
  @IsOptional() @IsUUID() unitId?: string;
  @IsOptional() @IsNumber() amount?: number;
  @IsOptional() @IsDateString() occurredAt?: string;
  @IsOptional() @IsString() externalRef?: string;
  @IsOptional() @IsString() emissionCategory?: string;
}
