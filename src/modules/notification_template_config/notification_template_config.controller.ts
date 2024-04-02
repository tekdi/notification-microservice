import { Controller, ParseIntPipe } from '@nestjs/common';
import { Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { identity } from 'rxjs';
import { Notification_Template_Config } from './entity/notification_template_config.entity';
import { NotificationTemplateConfigService } from './notification_template_config.service';

@Controller('notification-template-config')
export class NotificationTemplateConfigController {

  constructor(private notificationTemplateConfigService: NotificationTemplateConfigService) { }

  @Get()
  index(): Promise<Notification_Template_Config[]> {
    return this.notificationTemplateConfigService.findAll();
  }

  @Post('create')
  async create(@Body() NotificatioTemplateConfigData: Notification_Template_Config): Promise<any> {
    return this.notificationTemplateConfigService.create(NotificatioTemplateConfigData);
  }

  @Put(':id/update')
  async update(@Param('id') id, @Body() NotificatioTemplateConfigData: Notification_Template_Config): Promise<any> {
    NotificatioTemplateConfigData.id = id;
    console.log('Update #' + NotificatioTemplateConfigData.id)
    return this.notificationTemplateConfigService.update(NotificatioTemplateConfigData);
  }

  @Delete(':id/delete')
  async delete(@Param('id') id): Promise<any> {
    return this.notificationTemplateConfigService.delete(id);
  }

  @Get(':id')
  public getNotificationConfigByID(@Param('id') id: ParseIntPipe, @Param('language') language: string): Promise<Notification_Template_Config> {
    return this.notificationTemplateConfigService.getNotificationConfigByIDandLanguage(id, language);
  }



}
