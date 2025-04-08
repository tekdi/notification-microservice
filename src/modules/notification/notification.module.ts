import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEventsModule } from 'src/modules/notification_events/notification_events.module';
import { NotificationAdapterFactory } from './notificationadapters';
import { EmailAdapter } from './adapters/emailService.adapter';
import { PushAdapter } from './adapters/pushService.adapter';
import { NotificationActions } from '../notification_events/entity/notificationActions.entity';
import { NotificationActionTemplates } from '../notification_events/entity/notificationActionTemplates.entity';
import { NotificationLog } from './entity/notificationLogs.entity';
import { NotificationService } from './notification.service';
import { NotificationQueue } from '../notification-queue/entities/notificationQueue.entity';
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module';
import { NotificationQueueService } from '../notification-queue/notificationQueue.service';
import { TwilioSmsAdapter } from './adapters/sms/twilioSmsService.adapter';
import { AwsSmsAdapter } from './adapters/sms/awsSmsService.adapter';
import { Msg91SmsServiceAdapter } from './adapters/sms/msg91SmsService.adapter';


@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationActions, NotificationActionTemplates, NotificationLog, NotificationQueue]), // import entity here
    NotificationEventsModule, RabbitmqModule
  ],
  providers: [NotificationAdapterFactory, PushAdapter, EmailAdapter, NotificationService, NotificationQueueService, TwilioSmsAdapter, AwsSmsAdapter, Msg91SmsServiceAdapter],
  controllers: [NotificationController],
  exports: [NotificationService]
})
export class NotificationModule { }
