import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateIssueDto {
  @IsOptional() @IsUUID() governanceAuditId?: string;
  @IsString() @IsNotEmpty() title!: string;
  @IsString() @IsNotEmpty() description!: string;
  @IsUUID() severityId!: string;
  @IsUUID() ownerId!: string; // REQUIRED (spec §A8)
  @IsDateString() dueDate!: string; // REQUIRED
  @IsOptional() @IsDateString() raisedDate?: string;
}

export class UpdateIssueDto {
  @IsOptional() @IsString() @IsNotEmpty() title?: string;
  @IsOptional() @IsString() @IsNotEmpty() description?: string;
  @IsOptional() @IsUUID() severityId?: string;
  @IsOptional() @IsDateString() dueDate?: string;
}

export class TransitionIssueDto {
  @IsString() @IsNotEmpty() toStatus!: string; // ISSUE_STATUS code
  @IsOptional() @IsString() resolutionNotes?: string;
}

export class ChangeOwnerDto {
  @IsUUID() ownerId!: string;
}
