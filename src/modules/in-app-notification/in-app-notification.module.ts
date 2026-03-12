import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InAppNotificationCampaign } from './entities/in-app-notification-campaign.entity';
import { InAppNotificationRead } from './entities/in-app-notification-read.entity';
import { InAppNotificationService } from './in-app-notification.service';
import { InAppNotificationController } from './in-app-notification.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([InAppNotificationCampaign, InAppNotificationRead]),
  ],
  providers: [InAppNotificationService],
  controllers: [InAppNotificationController],
  exports: [InAppNotificationService],
})
export class InAppNotificationModule {}
