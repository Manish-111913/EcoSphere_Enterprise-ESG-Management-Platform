import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export const CATEGORY_TYPES = ['CSR_ACTIVITY', 'CHALLENGE'] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsIn(CATEGORY_TYPES)
  type!: CategoryType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// type is immutable after creation (spec §A8), so it is not editable here.
export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
