import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateCsrActivityDto {
  @IsString() @IsNotEmpty() title!: string;
  @IsUUID() categoryId!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsString() location?: string;
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;
  @IsOptional() @IsInt() @Min(1) capacity?: number;
  @IsInt() @Min(0) pointsValue!: number;
  @IsOptional() evidenceRequiredOverride?: boolean;
  @IsOptional() @IsUUID() statusId?: string;
}

export class UpdateCsrActivityDto {
  @IsOptional() @IsString() @IsNotEmpty() title?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsUUID() departmentId?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsInt() @Min(1) capacity?: number;
  @IsOptional() @IsInt() @Min(0) pointsValue?: number;
  @IsOptional() evidenceRequiredOverride?: boolean;
  @IsOptional() @IsUUID() statusId?: string;
}

export class ProofDto {
  @IsUUID() attachmentId!: string;
}

export class RejectDto {
  @IsString() @IsNotEmpty() remarks!: string;
}

export class DecisionRemarksDto {
  @IsOptional() @IsString() remarks?: string;
}
