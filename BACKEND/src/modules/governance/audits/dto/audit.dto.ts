import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateAuditDto {
  @IsString() @IsNotEmpty() title!: string;
  @IsOptional() @IsString() auditType?: string;
  @IsOptional() @IsString() scopeDescription?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsUUID() auditorId!: string;
  @IsOptional() @IsDateString() plannedStart?: string;
  @IsOptional() @IsDateString() plannedEnd?: string;
}

export class UpdateAuditDto {
  @IsOptional() @IsString() @IsNotEmpty() title?: string;
  @IsOptional() @IsString() auditType?: string;
  @IsOptional() @IsString() scopeDescription?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsUUID() auditorId?: string;
  @IsOptional() @IsDateString() plannedStart?: string;
  @IsOptional() @IsDateString() plannedEnd?: string;
}

export class CompleteAuditDto {
  @IsString() @IsNotEmpty() findingsSummary!: string;
  @IsInt() @Min(0) @Max(100) auditScore!: number;
}
