import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entity/notification.entity';
import { NotificationEventsModule } from 'src/modules/notification_events/notification_events.module';
import { NotificationTemplateConfigModule } from 'src/modules/notification_template_config/notification_template_config.module';
import { NotificationAdapterFactory } from './notificationadapters';
import { EmailAdapter } from './adapters/emailService.adapter';
import { SmsAdapter } from './adapters/smsService.adapter';
import { PushAdapter } from './adapters/pushService.adapter';
import { NotificationTemplates } from '../notification_events/entity/notificationTemplate.entity';
import { NotificationTemplateConfig } from '../notification_events/entity/notificationTemplateConfig.entity';
import { NotificationLog } from './entity/notificationLogs.entity';
import { NotificationService } from './notification.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, NotificationTemplates, NotificationTemplateConfig, NotificationLog]), // import entity here
    NotificationEventsModule,
    NotificationTemplateConfigModule,
  ],
  providers: [NotificationAdapterFactory, PushAdapter, SmsAdapter, EmailAdapter, NotificationService],
  controllers: [NotificationController],
  exports: [NotificationService]
})
export class NotificationModule { }
