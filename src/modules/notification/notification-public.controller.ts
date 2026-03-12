import { Body, Controller, Post, Query, Res, UsePipes, ValidationPipe, HttpStatus, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOkResponse, ApiBadRequestResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { InAppNotificationService } from '../in-app-notification/in-app-notification.service';
import {
  CreateInAppNotificationPublicDto,
  SendEmailNotificationPublicDto,
} from './dto/notification-public.dto';
import { RawNotificationDto } from './dto/notificationDto.dto';
import APIResponse from 'src/common/utils/response';
import { APIID } from 'src/common/utils/api-id.config';

/**
 * Public notification APIs – no authentication required.
 * Use for server-to-server or internal triggers (e.g. jobs, webhooks).
 */
@Controller('notification/public')
@ApiTags('Notification (Public – No Auth)')
export class NotificationPublicController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly inAppNotificationService: InAppNotificationService,
  ) {}

  @Post('in-app')
  @ApiOkResponse({ description: 'In-app notification campaign created' })
  @ApiBadRequestResponse({ description: 'Invalid request' })
  @ApiQuery({ name: 'userId', description: 'User UUID for created_by and updated_by', required: true })
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiBody({ type: CreateInAppNotificationPublicDto })
  async createInAppNotification(
    @Query('userId') userId: string,
    @Body() dto: CreateInAppNotificationPublicDto,
    @Res() res: Response,
  ): Promise<void> {
    if (!userId) {
      throw new BadRequestException('userId query param is required');
    }
    const campaign = await this.inAppNotificationService.createCampaign({
      templateId: dto.templateId ?? null,
      title: dto.title,
      message: dto.message,
      link: dto.link ?? null,
      notificationType: dto.notificationType,
      audienceType: dto.audienceType,
      audienceMetadata: dto.audienceMetadata ?? {},
      createdBy: userId,
      updatedBy: userId,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });
    res
      .status(HttpStatus.CREATED)
      .json(APIResponse.success(APIID.NOTIFICATION_CREATE_IN_APP, { campaignId: campaign.id }, String(HttpStatus.CREATED)));
  }

  @Post('email')
  @ApiOkResponse({ description: 'Email notification sent' })
  @ApiBadRequestResponse({ description: 'Invalid request' })
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiBody({ type: SendEmailNotificationPublicDto })
  async sendEmailNotification(
    @Body() dto: SendEmailNotificationPublicDto,
    @Res() res: Response,
  ): Promise<void> {
    const rawDto: RawNotificationDto = {
      email: {
        to: dto.to,
        subject: dto.subject,
        body: dto.body,
        from: dto.from,
      },
    };
    await this.notificationService.sendRawNotification(rawDto, 'system', res);
  }
}
