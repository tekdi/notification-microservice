import { Module } from '@nestjs/common';
import { NotificationQueueService } from './notificationQueue.service';
import { NotificationQueueController } from './notificationQueue.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationQueue } from './entities/notificationQueue.entity';
// import { AmqpConnection, RabbitMQModule } from '@nestjs-plus/rabbitmq';
import { NotificationService } from '../notification/notification.service';
import { NotificationAdapterFactory } from '../notification/notificationadapters';
import { LoggerService } from 'src/common/logger/logger.service';
import { EmailAdapter } from '../notification/adapters/emailService.adapter';
import { PushAdapter } from '../notification/adapters/pushService.adapter';
import { SmsAdapter } from '../notification/adapters/smsService.adapter';
import { NotificationActionTemplates } from '../notification_events/entity/notificationActionTemplates.entity';
import { NotificationActions } from '../notification_events/entity/notificationActions.entity';
import { NotificationLog } from '../notification/entity/notificationLogs.entity';
import { RabbitmqModule } from '../rabbitmq/rabbitmq.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationQueue, NotificationActionTemplates, NotificationActions, NotificationLog]),
    RabbitmqModule
  ],
  providers: [NotificationQueueService, NotificationService, NotificationAdapterFactory, LoggerService, EmailAdapter, SmsAdapter, PushAdapter],
  controllers: [NotificationQueueController],
  exports: [NotificationQueueService]
})
export class NotificationQueueModule { }
