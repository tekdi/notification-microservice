import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entity/notification.entity';
import { NotificationEventsModule } from 'src/modules/notification_events/notification_events.module';
import { NotificationTemplateConfigModule } from 'src/modules/notification_template_config/notification_template_config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]), NotificationEventsModule, NotificationTemplateConfigModule
  ],
  providers: [NotificationService],
  controllers: [NotificationController],
  exports: [NotificationService]
})
export class NotificationModule { }
