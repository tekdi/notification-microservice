import { Module } from '@nestjs/common';
import { NotificationEventsService } from './notification_events.service';
import { NotificationEventsController } from './notification_events.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationActions } from './entity/notificationActions.entity';
import { NotificationActionTemplates } from './entity/notificationActionTemplates.entity';
import { TypeormService } from '../typeorm/typeorm.service';

@Module(
  {
    imports: [
      TypeOrmModule.forFeature([NotificationActions, NotificationActionTemplates])
    ],
    providers: [NotificationEventsService, TypeormService],
    controllers: [NotificationEventsController],
    exports: [NotificationEventsService]
  })
export class NotificationEventsModule { }
