import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiBody,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import {
  InAppNotificationService,
  ListInAppCampaignsAudienceFilter,
} from './in-app-notification.service';
import { ListInAppCampaignsAdminDto, UpdateInAppCampaignAdminDto } from './dto/admin-in-app-campaign.dto';
import APIResponse from 'src/common/utils/response';
import { APIID } from 'src/common/utils/api-id.config';

function buildListAudienceFilter(body: ListInAppCampaignsAdminDto): ListInAppCampaignsAudienceFilter | undefined {
  const country = body.country?.trim() || undefined;
  let cohortIds: string[] | undefined;
  if (body.cohortId !== undefined) {
    const raw = Array.isArray(body.cohortId) ? body.cohortId : [body.cohortId];
    cohortIds = raw.map((c) => String(c).trim());
  }
  const autoParts: string[] = [];
  if (typeof body.auto_tags === 'string') {
    autoParts.push(...body.auto_tags.split(',').map((s) => s.trim()).filter(Boolean));
  } else if (Array.isArray(body.auto_tags)) {
    autoParts.push(...body.auto_tags.map((s) => String(s).trim()).filter(Boolean));
  }
  if (body.auto_tag?.trim()) {
    autoParts.push(body.auto_tag.trim());
  }
  const autoTags = [...new Set(autoParts.map((t) => t.toLowerCase()))];
  if (!country && !(cohortIds?.length) && !autoTags.length) {
    return undefined;
  }
  return {
    country,
    cohortIds: cohortIds?.length ? cohortIds : undefined,
    autoTags: autoTags.length ? autoTags : undefined,
  };
}

/**
 * Admin CRUD for in-app notification campaigns (NotificationCampaigns).
 * Authorization is expected from upstream middleware / gateway.
 */
@Controller('notifications/in-app/admin')
@ApiTags('In-App Notifications (Admin)')
export class InAppNotificationAdminController {
  constructor(private readonly inAppNotificationService: InAppNotificationService) {}

  @Post('list')
  @ApiOkResponse({ description: 'Paginated list of campaigns' })
  @ApiBadRequestResponse({ description: 'Invalid request' })
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiBody({ type: ListInAppCampaignsAdminDto })
  async listCampaigns(
    @Body() body: ListInAppCampaignsAdminDto,
    @Res() res: Response,
  ): Promise<void> {
    const limit = body.limit ?? 20;
    const offset = body.offset ?? 0;
    const { items, total } = await this.inAppNotificationService.listCampaignsAdmin(
      limit,
      offset,
      body.notificationType,
      buildListAudienceFilter(body),
    );
    res
      .status(HttpStatus.OK)
      .json(
        APIResponse.success(
          APIID.IN_APP_CAMPAIGN_ADMIN_LIST,
          { items, total, limit, offset },
          String(HttpStatus.OK),
        ),
      );
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Campaign updated' })
  @ApiBadRequestResponse({ description: 'Invalid request' })
  @ApiNotFoundResponse({ description: 'Campaign not found' })
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiBody({ type: UpdateInAppCampaignAdminDto })
  async updateCampaign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInAppCampaignAdminDto,
    @Res() res: Response,
  ): Promise<void> {
    const hasPatch =
      dto.title !== undefined ||
      dto.message !== undefined ||
      dto.link !== undefined ||
      dto.notificationType !== undefined ||
      dto.audienceType !== undefined ||
      dto.audienceMetadata !== undefined ||
      dto.templateId !== undefined ||
      dto.expiresAt !== undefined ||
      dto.updatedBy !== undefined;
    if (!hasPatch) {
      throw new BadRequestException('At least one field is required to update');
    }
    const updated = await this.inAppNotificationService.updateCampaignAdmin(id, dto);
    if (!updated) {
      res
        .status(HttpStatus.NOT_FOUND)
        .json(
          APIResponse.error(
            APIID.IN_APP_CAMPAIGN_ADMIN_UPDATE,
            'Campaign not found.',
            'Campaign not found.',
            String(HttpStatus.NOT_FOUND),
          ),
        );
      return;
    }
    res
      .status(HttpStatus.OK)
      .json(APIResponse.success(APIID.IN_APP_CAMPAIGN_ADMIN_UPDATE, updated, String(HttpStatus.OK)));
  }

  @Delete(':id')
  @ApiOkResponse({ description: 'Campaign deleted' })
  @ApiNotFoundResponse({ description: 'Campaign not found' })
  async deleteCampaign(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response): Promise<void> {
    const deleted = await this.inAppNotificationService.deleteCampaignAdmin(id);
    if (!deleted) {
      res
        .status(HttpStatus.NOT_FOUND)
        .json(
          APIResponse.error(
            APIID.IN_APP_CAMPAIGN_ADMIN_DELETE,
            'Campaign not found.',
            'Campaign not found.',
            String(HttpStatus.NOT_FOUND),
          ),
        );
      return;
    }
    res
      .status(HttpStatus.OK)
      .json(
        APIResponse.success(APIID.IN_APP_CAMPAIGN_ADMIN_DELETE, { id, deleted: true }, String(HttpStatus.OK)),
      );
  }
}
