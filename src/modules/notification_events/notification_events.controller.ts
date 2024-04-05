import { Controller, Res, UsePipes, ValidationPipe } from '@nestjs/common';
import { NotificationEventsService } from './notification_events.service';
import { Post, Body } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBody, ApiCreatedResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SearchFilterDto } from './dto/searchTemplateType.dto';
import { Response } from 'express';
import { CreateEventDto } from './dto/createTemplate.dto';

@Controller('notification-events')
@ApiTags('Event-type')
export class NotificationEventsController {
  constructor(private notificationeventsService: NotificationEventsService) { }

  @Post()
  @ApiCreatedResponse({ description: "created" })
  @ApiInternalServerErrorResponse({ description: "internal server error" })
  @ApiBadRequestResponse({ description: "Invalid request" })
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiBody({ type: CreateEventDto })
  async create(@Body() createEventDto: CreateEventDto, @Res() response: Response) {
    const userId = '016badad-22b0-4566-88e9-aab1b35b1dfc';
    return this.notificationeventsService.createTemplate(userId, createEventDto, response)
  }

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
