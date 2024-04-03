import { BadRequestException, Controller, Res, UsePipes, ValidationPipe } from '@nestjs/common';
import { NotificationEventsService } from './notification_events.service';
import { NotificationTemplates } from './entity/notificationTemplate.entity';
import { Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiInternalServerErrorResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SearchFilterDto } from './dto/searchTemplateType.dto';
import { Response } from 'express';

@Controller('notification-events')
@ApiTags('Event-type')
export class NotificationEventsController {
  constructor(private notificationeventsService: NotificationEventsService) { }

  @Post('/list')
  @ApiBody({ type: SearchFilterDto })
  @ApiInternalServerErrorResponse({ description: 'Server Error' })
  @ApiBadRequestResponse({ description: 'Invalid Request' })
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOkResponse({ description: 'Get Template List' })
  async getTemplates(@Body() searchFilterDto: SearchFilterDto, @Res() response: Response) {
    return this.notificationeventsService.getTemplatesTypesForEvent(searchFilterDto, response)
  }


  // @Get()
  // index(): Promise<NotificationTemplates[]> {
  //   return this.notificationeventsService.findAll();
  // }

  // @Post('create')
  // async create(@Body() NotificatioEventData: NotificationTemplates): Promise<any> {
  //   return this.notificationeventsService.create(NotificatioEventData);
  // }

  // @Put(':id/update')
  // async update(@Param('id') id, @Body() NotificatioEventData: NotificationTemplates): Promise<any> {
  //   NotificatioEventData.id = Number(id);
  //   console.log('Update #' + NotificatioEventData.id)
  //   return this.notificationeventsService.update(NotificatioEventData);
  // }

  // @Delete(':id/delete')
  // async delete(@Param('id') id): Promise<any> {
  //   return this.notificationeventsService.delete(id);
  // }

  // @Get(':action')
  // public getNotificationEventByAction(@Param('action') action: string): Promise<NotificationTemplates> {
  //   return this.notificationeventsService.getNotificationEventByAction(action);
  // }

  //   async findOneByAction(action: string): Promise<Notification_Events> {
  //     return await this.notificationeventsService.findOne<Notification_Events>({ where: { action } });
  // }


}
