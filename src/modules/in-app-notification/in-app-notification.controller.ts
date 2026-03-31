import {
  Controller,
  Post,
  Body,
  Res,
  UsePipes,
  ValidationPipe,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiBadRequestResponse, ApiBasicAuth, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { InAppNotificationService, UserProfileFilter } from './in-app-notification.service';
import { GetInAppNotificationsQueryDto } from './dto/get-in-app-notifications.dto';
import { MarkInAppNotificationReadDto } from './dto/mark-in-app-read.dto';
import { GetUserId } from 'src/common/decorator/userId.decorator';
import APIResponse from 'src/common/utils/response';
import { APIID } from 'src/common/utils/api-id.config';

/** Build UserProfileFilter from request body (cohortId string or array, auto_tags string or array, country) */
function buildUserProfileFilter(body: GetInAppNotificationsQueryDto): UserProfileFilter | undefined {
  const stripQuotes = (s: string) => s.replaceAll(/^["']|["']$/g, '').trim();
  const cohortRaw = body.cohortId;
  let cohortId: string | string[] | undefined;
  if (cohortRaw === undefined || cohortRaw === null) {
    cohortId = undefined;
  } else if (Array.isArray(cohortRaw)) {
    const ids = cohortRaw.map((s) => stripQuotes(String(s).trim())).filter(Boolean);
    cohortId = ids.length ? ids : undefined;
  } else {
    const one = stripQuotes(String(cohortRaw).trim());
    cohortId = one || undefined;
  }
  const auto_tagsRaw = body.auto_tags;
  let auto_tags: string[] | undefined;
  if (auto_tagsRaw === undefined || auto_tagsRaw === null) {
    auto_tags = undefined;
  } else if (Array.isArray(auto_tagsRaw)) {
    auto_tags = auto_tagsRaw.map((s) => stripQuotes(String(s).trim())).filter(Boolean);
  } else {
    auto_tags = String(auto_tagsRaw).split(',').map((s) => stripQuotes(s.trim())).filter(Boolean);
  }
  const country = body.country ? stripQuotes(body.country.trim()) : undefined;
  const hasCohort = Array.isArray(cohortId) ? cohortId.length > 0 : Boolean(cohortId);
  if (!hasCohort && !auto_tags?.length && !country) return undefined;
  return { cohortId, auto_tags, country: country || undefined };
}

@Controller('notifications/in-app')
@ApiTags('In-App Notifications')
@ApiBasicAuth('access-token')
export class InAppNotificationController {
  constructor(private readonly inAppNotificationService: InAppNotificationService) {}

  @Post()
  @ApiOkResponse({ description: 'List of in-app notifications for the user' })
  @ApiBadRequestResponse({ description: 'Invalid request' })
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiBody({ type: GetInAppNotificationsQueryDto })
  async getNotifications(
    @Body() body: GetInAppNotificationsQueryDto,
    @GetUserId() userId: string,
    @Res() res: Response,
  ): Promise<void> {
    const effectiveUserId = body.userId || userId;
    if (!effectiveUserId) {
      throw new BadRequestException('userId is required');
    }
    const userProfile = buildUserProfileFilter(body);
    const result = await this.inAppNotificationService.getNotifications(
      effectiveUserId,
      body.limit ?? 10,
      body.offset ?? 0,
      body.type,
      userProfile,
    );
    if (!result || result.length === 0) {
      res
        .status(HttpStatus.NOT_FOUND)
        .json(APIResponse.error(APIID.NOTIFICATION_LIST, 'No data found.', 'No data found.', '404'));
      return;
    }
    res
      .status(HttpStatus.OK)
      .json(APIResponse.success(APIID.NOTIFICATION_LIST, result, String(HttpStatus.OK)));
  }

  @Post('unread-count')
  @ApiOkResponse({ description: 'Unread notification count' })
  @ApiBadRequestResponse({ description: 'Invalid request' })
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiBody({ type: GetInAppNotificationsQueryDto })
  async getUnreadCount(
    @Body() body: GetInAppNotificationsQueryDto,
    @GetUserId() userId: string,
  ): Promise<{ unread: number }> {
    const effectiveUserId = body.userId || userId;
    if (!effectiveUserId) {
      throw new BadRequestException('userId is required (pass in body or use authenticated user)');
    }
    const userProfile = buildUserProfileFilter(body);
    const unread = await this.inAppNotificationService.getUnreadCount(effectiveUserId, userProfile);
    return { unread };
  }

  @Post('read')
  @ApiOkResponse({ description: 'Notification marked as read' })
  @ApiBadRequestResponse({ description: 'Invalid request' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async markAsRead(
    @Body() dto: MarkInAppNotificationReadDto,
    @GetUserId() userId: string,
  ): Promise<{ message: string }> {
    const effectiveUserId = dto.userId || userId;
    if (!effectiveUserId) {
      throw new BadRequestException('userId is required');
    }
    await this.inAppNotificationService.markAsRead(dto.notificationId, effectiveUserId);
    return { message: 'OK' };
  }
}
