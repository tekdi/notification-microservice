import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsOptional, IsEnum, IsInt, Min, IsBoolean, ValidateIf, IsObject, registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';
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

  @ApiPropertyOptional({ description: 'Title (required if key not provided)' })
  @ValidateIf((o) => !o.key)
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Message (required if key not provided)' })
  @ValidateIf((o) => !o.key)
  @IsString()
  message?: string;

  // removed: templateId (not stored; only key-based supported)

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
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expiresAt?: string;

  // removed: source (column dropped)
}

export enum InAppStatus {
  unread = 'unread',
  read = 'read',
  all = 'all',
}

// Custom validator: ensures at least one of the two fields is provided
export function IsAtLeastOne(relatedPropertyName: string, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isAtLeastOne',
      target: (object as any).constructor,
      propertyName,
      constraints: [relatedPropertyName],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [related] = args.constraints;
          const relatedValue = (args.object as any)[related];
          return value !== undefined && value !== null && value !== '' || relatedValue === true;
        },
      },
    });
  };
}

export class ListInAppNotificationsQueryDto {
  @ApiProperty({ description: 'User id (UUID)' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ enum: InAppStatus, default: InAppStatus.all })
  @IsOptional()
  @IsEnum(InAppStatus)
  status?: InAppStatus = InAppStatus.all;

  // Backward-compat page (1-based). Prefer offset if provided.
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  // Offset-based pagination (0-based). If provided, overrides page.
  @ApiPropertyOptional({ default: 0, description: 'Offset (0-based). If provided, page is ignored.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

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
  @IsAtLeastOne('markAll', { message: 'Either notificationId or markAll must be provided' })
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


