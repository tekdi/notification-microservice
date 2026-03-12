import { IsOptional, IsUUID, IsInt, Min, Max, IsIn, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/** Request body for POST /notifications/in-app (list) and POST /notifications/in-app/unread-count */
export class GetInAppNotificationsQueryDto {
  @ApiPropertyOptional({ description: 'Logged-in user ID' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Number of notifications to return (list only)', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Pagination offset (list only)', default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @ApiPropertyOptional({ description: 'Filter by notification type (list only)', enum: ['COURSE', 'EVENT', 'ANNOUNCEMENT'] })
  @IsOptional()
  @IsIn(['COURSE', 'EVENT', 'ANNOUNCEMENT'])
  type?: 'COURSE' | 'EVENT' | 'ANNOUNCEMENT';

  /** Audience filter: only show notifications matching user profile (cohortId, auto_tags, country in audience_metadata) */
  @ApiPropertyOptional({ description: "User's cohort ID (must match campaign audience_metadata.cohortId)" })
  @IsOptional()
  @IsUUID()
  cohortId?: string;

  @ApiPropertyOptional({ description: "User's tags, comma-separated (e.g. completed_alumni). Must match campaign audience_metadata.auto_tags" })
  @IsOptional()
  auto_tags?: string | string[];

  @ApiPropertyOptional({ description: "User's country (must match campaign audience_metadata.country)" })
  @IsOptional()
  @IsString()
  country?: string;
}
