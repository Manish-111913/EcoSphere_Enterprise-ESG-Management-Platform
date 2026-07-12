import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateRewardDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsInt() @IsPositive() pointsRequired!: number;
  @IsInt() @Min(0) stock!: number;
  @IsOptional() @IsString() imageKey?: string;
  @IsOptional() @IsUUID() statusId?: string;
}

export class UpdateRewardDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsInt() @IsPositive() pointsRequired?: number;
  @IsOptional() @IsInt() @Min(0) stock?: number;
  @IsOptional() @IsString() imageKey?: string;
  @IsOptional() @IsUUID() statusId?: string;
}
