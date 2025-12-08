import { Controller, Get, Query, Patch, Body, Post, Res, UseFilters, UsePipes, ValidationPipe, HttpStatus } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiInternalServerErrorResponse, ApiOkResponse, ApiTags, ApiBasicAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { InAppService } from './inApp.service';
import { CreateInAppNotificationDto, ListInAppNotificationsQueryDto, MarkInAppReadDto } from './dto/inapp.dto';
import APIResponse from 'src/common/utils/response';
import { APIID } from 'src/common/utils/api-id.config';
import { AllExceptionsFilter } from 'src/common/filters/exception.filter';

@Controller('notification/inApp')
@ApiTags('Notification-inApp')
@ApiBasicAuth('access-token')
export class InAppController {
  constructor(private readonly inAppService: InAppService) {}

  @UseFilters(new AllExceptionsFilter(APIID.SEND_NOTIFICATION))
  @Get()
  @ApiOkResponse({ description: 'List notifications or return unread count when limit=0' })
  @ApiBadRequestResponse({ description: 'Invalid Request' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async list(@Query() query: ListInAppNotificationsQueryDto, @Res() res: Response) {
    const result = await this.inAppService.list(query);
    return res.status(HttpStatus.OK).json(APIResponse.success(APIID.SEND_NOTIFICATION, result, 'OK'));
  }

  @UseFilters(new AllExceptionsFilter(APIID.SEND_NOTIFICATION))
  @Patch('mark-read')
  @ApiBody({ type: MarkInAppReadDto })
  @ApiOkResponse({ description: 'Mark one or all as read' })
  @ApiBadRequestResponse({ description: 'Invalid Request' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async markRead(@Body() dto: MarkInAppReadDto, @Res() res: Response) {
    const result = await this.inAppService.markRead(dto);
    return res.status(HttpStatus.OK).json(APIResponse.success(APIID.SEND_NOTIFICATION, result, 'OK'));
  }

  @UseFilters(new AllExceptionsFilter(APIID.SEND_NOTIFICATION))
  @Post()
  @ApiOkResponse({ description: 'Create an in-app notification (supports single or send-structure bulk)' })
  @ApiInternalServerErrorResponse({ description: 'Server Error' })
  @ApiBadRequestResponse({ description: 'Invalid Request' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: false }))
  async create(@Body() body: any, @Res() res: Response) {
    // Support both:
    // 1) Direct shape: { userId, context/key or templateId, replacements, ... }
    // 2) Send-like shape: { context, key, replacements, inApp: { receipients: [userId,...] }, ... }
    if (body?.inApp?.receipients && Array.isArray(body.inApp.receipients) && body.inApp.receipients.length > 0) {
      const results = [];
      for (const userId of body.inApp.receipients) {
        const saved = await this.inAppService.create({
          userId,
          context: body.context,
          key: body.key,
          replacements: body.replacements,
          link: body.link,
          metadata: body.metadata,
          tenant_code: body.tenant_code,
          org_code: body.org_code,
          expiresAt: body.expiresAt,
        } as CreateInAppNotificationDto);
        results.push({ recipient: userId, id: saved.id });
      }
      return res.status(HttpStatus.OK).json(APIResponse.success(APIID.SEND_NOTIFICATION, { inApp: { data: results } }, 'OK'));
    } else {
      const saved = await this.inAppService.create(body as CreateInAppNotificationDto);
      return res.status(HttpStatus.OK).json(APIResponse.success(APIID.SEND_NOTIFICATION, saved, 'OK'));
    }
  }
}


