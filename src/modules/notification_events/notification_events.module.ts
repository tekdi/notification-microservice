import { Module } from '@nestjs/common';
import { NotificationEventsService } from './notification_events.service';
import { NotificationEventsController } from './notification_events.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationTemplates } from './entity/notificationTemplate.entity';
import { NotificationTemplateConfig } from './entity/notificationTemplateConfig.entity';

@Module(
  {
    imports: [
      TypeOrmModule.forFeature([NotificationTemplates, NotificationTemplateConfig])
    ],
    providers: [NotificationEventsService],
    controllers: [NotificationEventsController],
    exports: [NotificationEventsService]
  })
export class NotificationEventsModule { }
