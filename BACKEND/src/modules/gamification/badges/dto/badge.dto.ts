import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export const BADGE_METRICS = ['xp_total', 'challenges_completed', 'csr_completed'] as const;
export const BADGE_OPERATORS = ['>=', '>', '='] as const;

export class UnlockRuleDto {
  @IsIn(BADGE_METRICS) metric!: (typeof BADGE_METRICS)[number];
  @IsIn(BADGE_OPERATORS) operator!: (typeof BADGE_OPERATORS)[number];
  @IsInt() @IsPositive() threshold!: number;
}

export class CreateBadgeDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() iconKey?: string;
  @ValidateNested() @Type(() => UnlockRuleDto) unlockRule!: UnlockRuleDto;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateBadgeDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() iconKey?: string;
  @IsOptional() @ValidateNested() @Type(() => UnlockRuleDto) unlockRule?: UnlockRuleDto;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ManualAwardDto {
  @IsUUID() employeeId!: string;
}

export class ReevaluateDto {
  @IsOptional() @IsUUID() employeeId?: string;
}
