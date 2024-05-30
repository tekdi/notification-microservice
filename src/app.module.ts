import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NotificationEventsModule } from './modules/notification_events/notification_events.module';
import { NotificationModule } from './modules/notification/notification.module';
import { DatabaseModule } from './common/database-modules';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from './logger/logger.module';
import { NotificationQueueModule } from './modules/notification-queue/notificationQueue.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    NotificationEventsModule, NotificationModule, LoggerModule, NotificationQueueModule],
  controllers: [AppController],
  providers: [AppService, ConfigService],
})

export class AppModule { }
