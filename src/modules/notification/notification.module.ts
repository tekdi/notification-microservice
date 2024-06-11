import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEventsModule } from 'src/modules/notification_events/notification_events.module';
import { NotificationAdapterFactory } from './notificationadapters';
import { EmailAdapter } from './adapters/emailService.adapter';
import { SmsAdapter } from './adapters/smsService.adapter';
import { PushAdapter } from './adapters/pushService.adapter';
import { NotificationActions } from '../notification_events/entity/notificationActions.entity';
import { NotificationActionTemplates } from '../notification_events/entity/notificationActionTemplates.entity';
import { NotificationLog } from './entity/notificationLogs.entity';
import { NotificationService } from './notification.service';
import { LoggerService } from 'src/common/logger/logger.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationActions, NotificationActionTemplates, NotificationLog]), // import entity here
    NotificationEventsModule,
  ],
  providers: [NotificationAdapterFactory, PushAdapter, SmsAdapter, EmailAdapter, NotificationService, LoggerService],
  controllers: [NotificationController],
  exports: [NotificationService]
})
export class NotificationModule { }
