import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InAppNotificationCampaign } from './entities/in-app-notification-campaign.entity';
import { InAppNotificationRead } from './entities/in-app-notification-read.entity';
import { InAppNotificationService } from './in-app-notification.service';
import { InAppNotificationController } from './in-app-notification.controller';
import { InAppNotificationAdminController } from './in-app-notification-admin.controller';
import { DefaultInAppNotificationFetchAdapter } from './adapters/default-in-app-notification-fetch.adapter';
import { IN_APP_NOTIFICATION_FETCH_ADAPTER } from './adapters/in-app-notification-fetch.adapter';

@Module({
  imports: [
    TypeOrmModule.forFeature([InAppNotificationCampaign, InAppNotificationRead]),
  ],
  providers: [
    InAppNotificationService,
    DefaultInAppNotificationFetchAdapter,
    {
      provide: IN_APP_NOTIFICATION_FETCH_ADAPTER,
      useExisting: DefaultInAppNotificationFetchAdapter,
    },
  ],
  controllers: [InAppNotificationController, InAppNotificationAdminController],
  exports: [InAppNotificationService],
})
export class InAppNotificationModule {}
