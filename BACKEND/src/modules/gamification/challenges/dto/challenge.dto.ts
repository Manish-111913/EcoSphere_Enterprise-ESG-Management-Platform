import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateChallengeDto {
  @IsString() @IsNotEmpty() title!: string;
  @IsUUID() categoryId!: string;
  @IsOptional() @IsString() description?: string;
  @IsPositive() xpValue!: number;
  @IsOptional() @IsUUID() difficultyId?: string;
  @IsOptional() @IsBoolean() evidenceRequired?: boolean;
  @IsDateString() startDate!: string;
  @IsDateString() deadline!: string;
  @IsOptional() @IsUUID() statusId?: string;
}

export class UpdateChallengeDto {
  @IsOptional() @IsString() @IsNotEmpty() title?: string;
  @IsOptional() @IsUUID() categoryId?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsPositive() xpValue?: number;
  @IsOptional() @IsUUID() difficultyId?: string;
  @IsOptional() @IsBoolean() evidenceRequired?: boolean;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() deadline?: string;
}

export class TransitionDto {
  @IsString() @IsNotEmpty() toStatus!: string; // CHALLENGE_STATUS code
}

export class ProgressDto {
  @IsInt() @Min(0) @Max(100) progressPct!: number;
}

export class ChallengeProofDto {
  @IsUUID() attachmentId!: string;
}

export class ChallengeRejectDto {
  @IsString() @IsNotEmpty() remarks!: string;
}

export class ChallengeDecisionDto {
  @IsOptional() @IsString() remarks?: string;
}
