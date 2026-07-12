import {
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateTrainingRecordDto {
  @IsUUID() employeeId!: string;
  @IsString() @IsNotEmpty() trainingName!: string;
  @IsOptional() @IsDateString() completedAt?: string;
  @IsOptional() @IsNumber() hours?: number;
  @IsOptional() @IsUUID() statusId?: string;
}
