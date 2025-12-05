import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional, IsEnum, IsInt, Min, IsBoolean, ValidateIf, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInAppNotificationDto {
  @ApiProperty({ description: 'User id (UUID)' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ description: 'Action context (used when resolving template by action). Optional when key is globally unique.' })
  @IsOptional()
  @IsString()
  context?: string;

  @ApiPropertyOptional({ description: 'Action key (used when resolving template by action)' })
  @IsOptional()
  @IsString()
  key?: string;

  @ApiPropertyOptional({
    description: 'Replacements for placeholder substitution. Keys may be "{name}" or "name".',
  })
  @IsOptional()
  @IsObject()
  replacements?: Record<string, string>;

  // Backward compatibility: accept templateParams as alias for replacements
  @ApiPropertyOptional({
    description: '[Deprecated] Use "replacements" instead. Will be removed later.',
  })
  @IsOptional()
  @IsObject()
  templateParams?: Record<string, string>;

  @ApiPropertyOptional({ description: 'Title (required if templateId not provided)' })
  @ValidateIf((o) => !o.templateId && !o.key)
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Message (required if templateId not provided)' })
  @ValidateIf((o) => !o.templateId && !o.key)
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Template UUID to render in-app content' })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tenant_code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  org_code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  link?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  source?: string;
}

export enum InAppStatus {
  unread = 'unread',
  read = 'read',
  all = 'all',
}

export class ListInAppNotificationsQueryDto {
  @ApiProperty({ description: 'User id (UUID)' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ enum: InAppStatus, default: InAppStatus.all })
  @IsOptional()
  @IsEnum(InAppStatus)
  status?: InAppStatus = InAppStatus.all;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, description: 'If 0 → return count only' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  limit?: number = 20;
}

export class MarkInAppReadDto {
  @ApiPropertyOptional({ description: 'Mark a single notification' })
  @IsOptional()
  @IsUUID()
  notificationId?: string;

  @ApiPropertyOptional({ description: 'Required if markAll=true' })
  @ValidateIf(o => o.markAll === true)
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Mark all unread for userId' })
  @IsOptional()
  @IsBoolean()
  markAll?: boolean = false;
}


