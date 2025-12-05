import { Module } from '@nestjs/common';
import { NotificationController } from './notification.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEventsModule } from 'src/modules/notification_events/notification_events.module';
import { NotificationAdapterFactory } from './notificationadapters';
import { EmailAdapter } from './adapters/emailService.adapter';
import { SmsAdapter } from './adapters/smsService.adapter';
import { PushAdapter } from './adapters/pushService.adapter';
import { WhatsappViaGupshupAdapter } from './adapters/whatsappViaGupshup.adapter';
import { InAppAdapter } from './adapters/inApp.adapter';
import { NotificationActions } from '../notification_events/entity/notificationActions.entity';
import { NotificationActionTemplates } from '../notification_events/entity/notificationActionTemplates.entity';
import { NotificationLog } from './entity/notificationLogs.entity';
import { NotificationService } from './notification.service';
import { NotificationQueue } from '../notification-queue/entities/notificationQueue.entity';
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module';
import { NotificationQueueService } from '../notification-queue/notificationQueue.service';
import { InAppNotification } from './entity/inAppNotification.entity';
import { InAppService } from './inApp.service';
import { InAppController } from './inApp.controller';


@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationActions, NotificationActionTemplates, NotificationLog, NotificationQueue, InAppNotification]), // import entity here
    NotificationEventsModule, RabbitmqModule
  ],
  providers: [NotificationAdapterFactory, PushAdapter, SmsAdapter, EmailAdapter, WhatsappViaGupshupAdapter, InAppAdapter, NotificationService, NotificationQueueService, InAppService],
  controllers: [NotificationController, InAppController],
  exports: [NotificationService]
})
export class NotificationModule { }
