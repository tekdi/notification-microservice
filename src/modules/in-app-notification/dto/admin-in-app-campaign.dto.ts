import { Type } from 'class-transformer';
import { IsInt, IsIn, IsObject, IsOptional, IsString, IsUUID, Min, Max, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const NOTIFICATION_TYPES = ['ANNOUNCEMENT', 'COURSE', 'EVENT'] as const;
const AUDIENCE_TYPES = ['ALL_USERS', 'COHORT', 'ROLE', 'USER_LIST'] as const;

/** Body for POST /notifications/in-app/admin/list */
export class ListInAppCampaignsAdminDto {
  @ApiPropertyOptional({ description: 'Page size', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Pagination offset', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({ enum: NOTIFICATION_TYPES })
  @IsOptional()
  @IsIn([...NOTIFICATION_TYPES])
  notificationType?: (typeof NOTIFICATION_TYPES)[number];
}

/** Body for PATCH /notifications/in-app/admin/:id — send at least one field */
export class UpdateInAppCampaignAdminDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: 'Deep link; empty string clears' })
  @IsOptional()
  @ValidateIf((_, v) => v !== null && v !== undefined)
  @IsString()
  link?: string | null;

  @ApiPropertyOptional({ enum: NOTIFICATION_TYPES })
  @IsOptional()
  @IsIn([...NOTIFICATION_TYPES])
  notificationType?: (typeof NOTIFICATION_TYPES)[number];

  @ApiPropertyOptional({ enum: AUDIENCE_TYPES })
  @IsOptional()
  @IsIn([...AUDIENCE_TYPES])
  audienceType?: (typeof AUDIENCE_TYPES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  audienceMetadata?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Template UUID; null removes link', nullable: true })
  @IsOptional()
  @ValidateIf((_, v) => v != null)
  @IsUUID()
  templateId?: string | null;

  @ApiPropertyOptional({
    description: 'ISO 8601 expiry; null or empty string clears expiry',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, v) => v != null && v !== '')
  @IsString()
  expiresAt?: string | null;

  @ApiPropertyOptional({ description: 'Actor user UUID for audit (e.g. from gateway middleware)' })
  @IsOptional()
  @IsUUID()
  updatedBy?: string;
}
