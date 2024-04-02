import { Controller } from '@nestjs/common';
import { NotificationEventsService } from './notification_events.service';
import { NotificationEvents } from './entity/notification_events.entity';
import { Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@Controller('notification-events')
@ApiTags('Event-type')
export class NotificationEventsController {
  constructor(private notificationeventsService: NotificationEventsService) { }

  @Get()
  index(): Promise<NotificationEvents[]> {
    return this.notificationeventsService.findAll();
  }

  @Post('create')
  async create(@Body() NotificatioEventData: NotificationEvents): Promise<any> {
    return this.notificationeventsService.create(NotificatioEventData);
  }

  @Put(':id/update')
  async update(@Param('id') id, @Body() NotificatioEventData: NotificationEvents): Promise<any> {
    NotificatioEventData.id = Number(id);
    console.log('Update #' + NotificatioEventData.id)
    return this.notificationeventsService.update(NotificatioEventData);
  }

  @Delete(':id/delete')
  async delete(@Param('id') id): Promise<any> {
    return this.notificationeventsService.delete(id);
  }

  @Get(':action')
  public getNotificationEventByAction(@Param('action') action: string): Promise<NotificationEvents> {
    return this.notificationeventsService.getNotificationEventByAction(action);
  }

  //   async findOneByAction(action: string): Promise<Notification_Events> {
  //     return await this.notificationeventsService.findOne<Notification_Events>({ where: { action } });
  // }


}
