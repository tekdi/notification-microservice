import {
  InAppNotificationItem,
  UserProfileFilter,
} from '../in-app-notification.service';
import { GetInAppNotificationsQueryDto } from '../dto/get-in-app-notifications.dto';
import type { NotificationType } from '../entities/in-app-notification-campaign.entity';

export interface InAppNotificationFetchParams {
  userId: string;
  limit?: number;
  offset?: number;
  type?: NotificationType;
  userProfile?: UserProfileFilter;
}

export interface InAppNotificationFetchAdapter {
  buildUserProfileFilter(body: GetInAppNotificationsQueryDto): UserProfileFilter | undefined;
  getNotifications(params: InAppNotificationFetchParams): Promise<InAppNotificationItem[]>;
  getUnreadCount(params: InAppNotificationFetchParams): Promise<number>;
}

export const IN_APP_NOTIFICATION_FETCH_ADAPTER = Symbol('IN_APP_NOTIFICATION_FETCH_ADAPTER');
