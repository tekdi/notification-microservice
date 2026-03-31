import {
  Controller,
  Post,
  Body,
  Res,
  UsePipes,
  ValidationPipe,
  BadRequestException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOkResponse, ApiBadRequestResponse, ApiBasicAuth, ApiBody } from '@nestjs/swagger';
import { Response } from 'express';
import { InAppNotificationService } from './in-app-notification.service';
import { GetInAppNotificationsQueryDto } from './dto/get-in-app-notifications.dto';
import { MarkInAppNotificationReadDto } from './dto/mark-in-app-read.dto';
import { GetUserId } from 'src/common/decorator/userId.decorator';
import APIResponse from 'src/common/utils/response';
import { APIID } from 'src/common/utils/api-id.config';
import {
  IN_APP_NOTIFICATION_FETCH_ADAPTER,
  InAppNotificationFetchAdapter,
} from './adapters/in-app-notification-fetch.adapter';

@Controller('notifications/in-app')
@ApiTags('In-App Notifications')
@ApiBasicAuth('access-token')
export class InAppNotificationController {
  constructor(
    private readonly inAppNotificationService: InAppNotificationService,
    @Inject(IN_APP_NOTIFICATION_FETCH_ADAPTER)
    private readonly inAppNotificationFetchAdapter: InAppNotificationFetchAdapter,
  ) {}

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
    const userProfile = this.inAppNotificationFetchAdapter.buildUserProfileFilter(body);
    const result = await this.inAppNotificationFetchAdapter.getNotifications({
      userId: effectiveUserId,
      limit: body.limit ?? 10,
      offset: body.offset ?? 0,
      type: body.type,
      userProfile,
    });
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
    const userProfile = this.inAppNotificationFetchAdapter.buildUserProfileFilter(body);
    const unread = await this.inAppNotificationFetchAdapter.getUnreadCount({
      userId: effectiveUserId,
      userProfile,
    });
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
