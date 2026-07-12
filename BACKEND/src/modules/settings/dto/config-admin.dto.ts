import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateEsgWeightsDto {
  @IsInt() @Min(0) environmentalWeight!: number;
  @IsInt() @Min(0) socialWeight!: number;
  @IsInt() @Min(0) governanceWeight!: number;

  @IsOptional()
  @IsString()
  effectiveFrom?: string;
}

export class ScoringConfigUpdateItem {
  @IsUUID() id!: string;
  @IsInt() @Min(0) weight!: number;

  @IsOptional()
  @IsObject()
  normalization?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateScoringConfigsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScoringConfigUpdateItem)
  configs!: ScoringConfigUpdateItem[];
}

const APPROVAL_ENTITY = ['CSR_PARTICIPATION', 'CHALLENGE_PARTICIPATION'] as const;
const APPROVAL_SCOPE = ['ANY', 'SAME_DEPARTMENT'] as const;

export class CreateApprovalRuleDto {
  @IsIn(APPROVAL_ENTITY) entityType!: (typeof APPROVAL_ENTITY)[number];
  @IsUUID() approverRoleId!: string;

  @IsOptional()
  @IsIn(APPROVAL_SCOPE)
  scope?: (typeof APPROVAL_SCOPE)[number];

  @IsOptional()
  @IsBoolean()
  evidenceRequiredOverride?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateApprovalRuleDto {
  @IsOptional() @IsUUID() approverRoleId?: string;
  @IsOptional() @IsIn(APPROVAL_SCOPE) scope?: (typeof APPROVAL_SCOPE)[number];
  @IsOptional() @IsBoolean() evidenceRequiredOverride?: boolean | null;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateDashboardConfigDto {
  @IsUUID() roleId!: string;
  @IsString() @IsNotEmpty() widgetCode!: string;
  @IsOptional() @IsInt() position?: number;
  @IsOptional() @IsBoolean() isVisible?: boolean;
  @IsOptional() @IsObject() config?: Record<string, unknown>;
}

export class UpdateDashboardConfigDto {
  @IsOptional() @IsInt() position?: number;
  @IsOptional() @IsBoolean() isVisible?: boolean;
  @IsOptional() @IsObject() config?: Record<string, unknown>;
}
