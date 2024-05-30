import { Module } from '@nestjs/common';
import { NotificationQueueService } from './notificationQueue.service';
import { NotificationQueueController } from './notificationQueue.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationQueue } from './entities/notificationQueue.entity';


@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationQueue])
  ],
  providers: [NotificationQueueService],
  controllers: [NotificationQueueController],
  exports: [NotificationQueueService]
})
export class NotificationQueueModule { }
