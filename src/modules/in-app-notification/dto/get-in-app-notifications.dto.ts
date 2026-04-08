import {
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsIn,
  IsString,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

const UUID_V4_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function IsUuidOrUuidArray(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isUuidOrUuidArray',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (value === undefined || value === null) return true;
          if (typeof value === 'string') return UUID_V4_LIKE.test(value.trim());
          if (Array.isArray(value)) {
            return (
              value.length > 0 &&
              value.every((v) => typeof v === 'string' && UUID_V4_LIKE.test(String(v).trim()))
            );
          }
          return false;
        },
        defaultMessage() {
          return 'cohortId must be a UUID string or a non-empty array of UUID strings';
        },
      },
    });
  };
}

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
  @ApiPropertyOptional({
    description:
      "User's cohort ID(s); single UUID or array if the user belongs to multiple cohorts (must overlap campaign audience_metadata.cohortId / cohortIds)",
    oneOf: [{ type: 'string', format: 'uuid' }, { type: 'array', items: { type: 'string', format: 'uuid' } }],
  })
  @IsOptional()
  @IsUuidOrUuidArray()
  cohortId?: string | string[];

  @ApiPropertyOptional({ description: "User's tags, comma-separated (e.g. completed_alumni). Must match campaign audience_metadata.auto_tags" })
  @IsOptional()
  auto_tags?: string | string[];

  @ApiPropertyOptional({ description: "User's country (must match campaign audience_metadata.country)" })
  @IsOptional()
  @IsString()
  country?: string;
}
