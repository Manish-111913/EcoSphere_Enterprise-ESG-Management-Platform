import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

const STRATEGIES = ['ACTOR', 'OWNER', 'ROLE', 'DEPARTMENT_HEAD', 'ALL_AFFECTED'] as const;

export class CreateTemplateDto {
  @IsString() @IsNotEmpty() code!: string;
  @IsString() @IsNotEmpty() titleTemplate!: string;
  @IsString() @IsNotEmpty() bodyTemplate!: string;
  @IsOptional() @IsObject() channelDefaults?: Record<string, unknown>;
}

export class UpdateTemplateDto {
  @IsOptional() @IsString() @IsNotEmpty() titleTemplate?: string;
  @IsOptional() @IsString() @IsNotEmpty() bodyTemplate?: string;
  @IsOptional() @IsObject() channelDefaults?: Record<string, unknown>;
}

export class CreateRuleDto {
  @IsString() @IsNotEmpty() eventCode!: string;
  @IsUUID() templateId!: string;
  @IsArray() @IsString({ each: true }) channels!: string[];
  @IsIn(STRATEGIES) recipientStrategy!: (typeof STRATEGIES)[number];
  @IsOptional() @IsUUID() recipientRoleId?: string;
  @IsOptional() @IsString() scheduleCron?: string;
  @IsOptional() @IsBoolean() isEnabled?: boolean;
}

export class UpdateRuleDto {
  @IsOptional() @IsString() @IsNotEmpty() eventCode?: string;
  @IsOptional() @IsUUID() templateId?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) channels?: string[];
  @IsOptional() @IsIn(STRATEGIES) recipientStrategy?: (typeof STRATEGIES)[number];
  @IsOptional() @IsUUID() recipientRoleId?: string;
  @IsOptional() @IsString() scheduleCron?: string;
  @IsOptional() @IsBoolean() isEnabled?: boolean;
}

export class TestRuleDto {
  @IsOptional() @IsObject() @Type(() => Object) data?: Record<string, string | number>;
}
