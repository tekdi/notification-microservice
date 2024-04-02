import { Module } from '@nestjs/common';
import { NotificationEventsService } from './notification_events.service';
import { NotificationEventsController } from './notification_events.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationEvents } from './entity/notification_events.entity';

@Module(
  {
    imports: [
      TypeOrmModule.forFeature([NotificationEvents])
    ],
    providers: [NotificationEventsService],
    controllers: [NotificationEventsController],
    exports: [NotificationEventsService]
  })
export class NotificationEventsModule { }
