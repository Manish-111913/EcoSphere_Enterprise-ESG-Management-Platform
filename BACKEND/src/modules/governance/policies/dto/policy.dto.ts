import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

const AUDIENCES = ['ALL', 'DEPARTMENT'] as const;

export class CreatePolicyDto {
  @IsString() @IsNotEmpty() title!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() documentAttachmentId?: string;
  @IsOptional() @IsDateString() effectiveDate?: string;
  @IsOptional() @IsDateString() acknowledgementDeadline?: string;
  @IsOptional() @IsIn(AUDIENCES) audience?: (typeof AUDIENCES)[number];
  @IsOptional() @IsUUID() audienceDepartmentId?: string;
}

export class UpdatePolicyDto {
  @IsOptional() @IsString() @IsNotEmpty() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() documentAttachmentId?: string;
  @IsOptional() @IsDateString() effectiveDate?: string;
  @IsOptional() @IsDateString() acknowledgementDeadline?: string;
  @IsOptional() @IsIn(AUDIENCES) audience?: (typeof AUDIENCES)[number];
  @IsOptional() @IsUUID() audienceDepartmentId?: string;
}
