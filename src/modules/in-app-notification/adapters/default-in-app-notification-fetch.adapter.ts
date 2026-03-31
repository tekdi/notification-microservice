import { Injectable } from '@nestjs/common';
import { GetInAppNotificationsQueryDto } from '../dto/get-in-app-notifications.dto';
import {
  InAppNotificationItem,
  InAppNotificationService,
  UserProfileFilter,
} from '../in-app-notification.service';
import {
  InAppNotificationFetchAdapter,
  InAppNotificationFetchParams,
} from './in-app-notification-fetch.adapter';

@Injectable()
/**
 * Aspire-specific default adapter.
 * Update this implementation per product/project use case when audience/profile fields differ.
 * Keep this adapter as the extension point for future email-notification audience/profile mapping.
 */
export class DefaultInAppNotificationFetchAdapter implements InAppNotificationFetchAdapter {
  constructor(private readonly inAppNotificationService: InAppNotificationService) {}

  buildUserProfileFilter(body: GetInAppNotificationsQueryDto): UserProfileFilter | undefined {
    const stripQuotes = (s: string) => s.replaceAll(/^["']|["']$/g, '').trim();
    const cohortRaw = body.cohortId;
    let cohortId: string | string[] | undefined;
    if (cohortRaw === undefined || cohortRaw === null) {
      cohortId = undefined;
    } else if (Array.isArray(cohortRaw)) {
      const ids = cohortRaw.map((s) => stripQuotes(String(s).trim())).filter(Boolean);
      cohortId = ids.length ? ids : undefined;
    } else {
      const one = stripQuotes(String(cohortRaw).trim());
      cohortId = one || undefined;
    }

    const autoTagsRaw = body.auto_tags;
    let auto_tags: string[] | undefined;
    if (autoTagsRaw === undefined || autoTagsRaw === null) {
      auto_tags = undefined;
    } else if (Array.isArray(autoTagsRaw)) {
      auto_tags = autoTagsRaw.map((s) => stripQuotes(String(s).trim())).filter(Boolean);
    } else {
      auto_tags = String(autoTagsRaw)
        .split(',')
        .map((s) => stripQuotes(s.trim()))
        .filter(Boolean);
    }

    const country = body.country ? stripQuotes(body.country.trim()) : undefined;
    const hasCohort = Array.isArray(cohortId) ? cohortId.length > 0 : Boolean(cohortId);
    if (!hasCohort && !auto_tags?.length && !country) return undefined;
    return { cohortId, auto_tags, country: country || undefined };
  }

  async getNotifications(params: InAppNotificationFetchParams): Promise<InAppNotificationItem[]> {
    return this.inAppNotificationService.getNotifications(
      params.userId,
      params.limit ?? 10,
      params.offset ?? 0,
      params.type,
      params.userProfile,
    );
  }

  async getUnreadCount(params: InAppNotificationFetchParams): Promise<number> {
    return this.inAppNotificationService.getUnreadCount(params.userId, params.userProfile);
  }
}
