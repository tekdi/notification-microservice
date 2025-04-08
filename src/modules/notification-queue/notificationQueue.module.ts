import { Module } from '@nestjs/common';
import { NotificationQueueService } from './notificationQueue.service';
import { NotificationQueueController } from './notificationQueue.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationQueue } from './entities/notificationQueue.entity';
// import { AmqpConnection, RabbitMQModule } from '@nestjs-plus/rabbitmq';
import { NotificationService } from '../notification/notification.service';
import { NotificationAdapterFactory } from '../notification/notificationadapters';
import { EmailAdapter } from '../notification/adapters/emailService.adapter';
import { PushAdapter } from '../notification/adapters/pushService.adapter';
import { NotificationActionTemplates } from '../notification_events/entity/notificationActionTemplates.entity';
import { NotificationActions } from '../notification_events/entity/notificationActions.entity';
import { NotificationLog } from '../notification/entity/notificationLogs.entity';
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module';
import { TwilioSmsAdapter } from '../notification/adapters/sms/twilioSmsService.adapter';
import { AwsSmsAdapter } from '../notification/adapters/sms/awsSmsService.adapter';
import { Msg91SmsServiceAdapter } from '../notification/adapters/sms/msg91SmsService.adapter';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationQueue, NotificationActionTemplates, NotificationActions, NotificationLog]),
    RabbitmqModule
  ],
  providers: [NotificationQueueService, NotificationService, NotificationAdapterFactory, EmailAdapter, PushAdapter, TwilioSmsAdapter, AwsSmsAdapter, Msg91SmsServiceAdapter],
  controllers: [NotificationQueueController],
  exports: [NotificationQueueService]
})
export class NotificationQueueModule { }
