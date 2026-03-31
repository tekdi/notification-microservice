import { IsString, IsOptional, IsObject, IsIn, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** DTO for creating an in-app notification campaign (no auth) */
export class CreateInAppNotificationPublicDto {
  @ApiProperty({ description: 'Notification title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Notification message' })
  @IsString()
  message: string;

  @ApiPropertyOptional({ description: 'Redirect URL/link' })
  @IsOptional()
  @IsString()
  link?: string;

  @ApiProperty({ description: 'Notification type', enum: ['ANNOUNCEMENT', 'COURSE', 'EVENT'] })
  @IsString()
  @IsIn(['ANNOUNCEMENT', 'COURSE', 'EVENT'])
  notificationType: 'ANNOUNCEMENT' | 'COURSE' | 'EVENT';

  @ApiProperty({ description: 'Audience type', enum: ['ALL_USERS', 'COHORT', 'ROLE', 'USER_LIST'] })
  @IsString()
  @IsIn(['ALL_USERS', 'COHORT', 'ROLE', 'USER_LIST'])
  audienceType: 'ALL_USERS' | 'COHORT' | 'ROLE' | 'USER_LIST';

  @ApiPropertyOptional({ description: 'Audience identifiers, e.g. { userIds: ["uuid"] } or { cohortIds: ["C101"] }', default: {} })
  @IsOptional()
  @IsObject()
  audienceMetadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Template UUID (use an existing NotificationActionTemplates.templateId)' })
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Expiry timestamp (ISO string)' })
  @IsOptional()
  @IsString()
  expiresAt?: string;
}
