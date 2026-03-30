import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { InAppNotificationCampaign } from './entities/in-app-notification-campaign.entity';
import { InAppNotificationRead } from './entities/in-app-notification-read.entity';
import type { AudienceType, NotificationType } from './entities/in-app-notification-campaign.entity';

/** User profile attributes used to filter notifications by audience_metadata (cohortId/cohortIds, auto_tags, country/countries) */
export interface UserProfileFilter {
  cohortId?: string;
  /** User's tags. Campaign is shown if user has at least one tag in metadata.auto_tags (or all if single tag in metadata). */
  auto_tags?: string[];
  country?: string;
}

export interface InAppNotificationItem {
  id: string;
  title: string;
  message: string;
  link: string | null;
  notificationType: NotificationType;
  isRead: boolean;
  createdAt: string;
}

export interface CreateInAppCampaignParams {
  templateId: string | null;
  title: string;
  message: string;
  link: string | null;
  notificationType: NotificationType;
  audienceType: AudienceType;
  audienceMetadata: Record<string, unknown>;
  createdBy: string;
  updatedBy?: string | null;
  expiresAt?: Date | null;
}

@Injectable()
export class InAppNotificationService implements OnModuleDestroy {
  private readonly GLOBAL_VERSION_KEY = 'notif:global_version';
  private readonly USER_UNREAD_PREFIX = 'unread:user:';
  private readonly redis: Redis | null;
  private readonly unreadCountTtlSec: number;

  constructor(
    @InjectRepository(InAppNotificationCampaign)
    private readonly campaignRepository: Repository<InAppNotificationCampaign>,
    @InjectRepository(InAppNotificationRead)
    private readonly readRepository: Repository<InAppNotificationRead>,
    private readonly configService: ConfigService,
  ) {
    this.unreadCountTtlSec = Number(this.configService.get('UNREAD_COUNT_TTL_SEC') || 600);
    const host = this.configService.get<string>('REDIS_HOST');
    const port = Number(this.configService.get('REDIS_PORT') || 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD') || undefined;
    const db = Number(this.configService.get('REDIS_DB') || 0);
    this.redis = host
      ? new Redis({
          host,
          port,
          password,
          db,
          lazyConnect: true,
          maxRetriesPerRequest: 1,
        })
      : null;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  private getUnreadCacheKey(userId: string): string {
    return `${this.USER_UNREAD_PREFIX}${userId}`;
  }

  private async ensureRedisConnected(): Promise<void> {
    if (!this.redis) return;
    if (this.redis.status === 'ready' || this.redis.status === 'connect') return;
    await this.redis.connect();
  }

  private async getGlobalVersion(): Promise<number> {
    if (!this.redis) return 0;
    try {
      await this.ensureRedisConnected();
      const value = await this.redis.get(this.GLOBAL_VERSION_KEY);
      return Number(value || 0);
    } catch {
      return 0;
    }
  }

  private async incrementGlobalVersion(): Promise<void> {
    if (!this.redis) return;
    try {
      await this.ensureRedisConnected();
      await this.redis.incr(this.GLOBAL_VERSION_KEY);
    } catch {
      // Fallback is DB recalculation on cache miss/mismatch.
    }
  }

  private async cacheUnreadCount(userId: string, count: number, version: number): Promise<void> {
    if (!this.redis) return;
    try {
      await this.ensureRedisConnected();
      await this.redis.set(
        this.getUnreadCacheKey(userId),
        JSON.stringify({ count: Math.max(0, count), version }),
        'EX',
        this.unreadCountTtlSec,
      );
    } catch {
      // Ignore cache write errors and return DB-backed result.
    }
  }

  private async decrementUnreadCacheCount(userId: string): Promise<void> {
    if (!this.redis) return;
    try {
      await this.ensureRedisConnected();
      const cacheKey = this.getUnreadCacheKey(userId);
      const cached = await this.redis.get(cacheKey);
      if (!cached) return;
      const parsed = JSON.parse(cached) as { count?: number; version?: number };
      if (typeof parsed?.count !== 'number' || typeof parsed?.version !== 'number') return;
      await this.redis.set(
        cacheKey,
        JSON.stringify({
          count: Math.max(0, parsed.count - 1),
          version: parsed.version,
        }),
        'EX',
        this.unreadCountTtlSec,
      );
    } catch {
      // Ignore cache decrement errors.
    }
  }

  private async calculateUnreadCountFromDb(
    userId: string,
    userProfile?: UserProfileFilter | null,
  ): Promise<number> {
    const campaigns = await this.campaignRepository
      .createQueryBuilder('c')
      .select(['c.id', 'c.audience_type', 'c.audience_metadata'])
      .where('(c.expires_at IS NULL OR c.expires_at >= :now)', { now: new Date() })
      .getMany();

    const readIds = await this.readRepository.find({
      where: { user_id: userId },
      select: ['notification_id'],
    });
    const readSet = new Set(readIds.map((r) => r.notification_id));

    let count = 0;
    for (const c of campaigns) {
      if (readSet.has(c.id)) continue;
      if (this.isUserInAudience(userId, c.audience_type, c.audience_metadata || {}, userProfile)) count++;
    }
    return count;
  }

  private stripAudienceQuotes(value: string): string {
    return String(value).trim().replaceAll(/^["']|["']$/g, '');
  }

  private getResolvedUserIds(audienceMetadata: Record<string, unknown>): string[] {
    const raw = audienceMetadata?.resolvedUserIds;
    return Array.isArray(raw) ? (raw as string[]) : [];
  }

  private audienceMetadataHasAttributeFilters(audienceMetadata: Record<string, unknown>): boolean {
    const metaCohortId = audienceMetadata?.cohortId;
    const metaCohortIds = audienceMetadata?.cohortIds;
    const metaAutoTags = audienceMetadata?.auto_tags;
    const metaCountry = audienceMetadata?.country;
    const metaCountries = audienceMetadata?.countries;
    return (
      metaCohortId !== undefined ||
      (Array.isArray(metaCohortIds) && metaCohortIds.length > 0) ||
      metaAutoTags !== undefined ||
      metaCountry !== undefined ||
      (Array.isArray(metaCountries) && metaCountries.length > 0)
    );
  }

  private buildAllowedCohortIds(audienceMetadata: Record<string, unknown>): string[] {
    const metaCohortId = audienceMetadata?.cohortId as string | string[] | undefined;
    const metaCohortIds = audienceMetadata?.cohortIds as string[] | undefined;
    if (Array.isArray(metaCohortIds)) {
      return metaCohortIds.map((c) => this.stripAudienceQuotes(String(c)));
    }
    if (metaCohortId === undefined) return [];
    if (Array.isArray(metaCohortId)) {
      return metaCohortId.map((c) => this.stripAudienceQuotes(String(c)));
    }
    return [this.stripAudienceQuotes(String(metaCohortId))];
  }

  private userMatchesCohortConstraint(
    userProfile: UserProfileFilter,
    audienceMetadata: Record<string, unknown>,
  ): boolean {
    const allowedCohorts = this.buildAllowedCohortIds(audienceMetadata);
    if (allowedCohorts.length === 0) return true;
    const userCohort = userProfile.cohortId ? this.stripAudienceQuotes(userProfile.cohortId) : '';
    return Boolean(userCohort && allowedCohorts.includes(userCohort));
  }

  private normalizeAudienceTag(value: unknown): string | null {
    if (typeof value === 'string') return value.trim().toLowerCase();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value).trim().toLowerCase();
    return null;
  }

  private userMatchesTagConstraint(userProfile: UserProfileFilter, audienceMetadata: Record<string, unknown>): boolean {
    const metaAutoTags = audienceMetadata?.auto_tags;
    if (metaAutoTags === undefined) return true;
    let allowedTags: string[];
    if (Array.isArray(metaAutoTags)) {
      allowedTags = (metaAutoTags as unknown[])
        .map((t) => this.normalizeAudienceTag(t))
        .filter((t): t is string => t !== null);
    } else {
      const one = this.normalizeAudienceTag(metaAutoTags);
      allowedTags = one === null ? [] : [one];
    }
    const userTagSet = new Set(
      (userProfile.auto_tags || []).map((t) => String(t).trim().toLowerCase()),
    );
    return allowedTags.some((tag) => userTagSet.has(tag));
  }

  private buildAllowedCountriesLower(audienceMetadata: Record<string, unknown>): string[] {
    const metaCountry = audienceMetadata?.country as string | undefined;
    const metaCountries = audienceMetadata?.countries as string[] | undefined;
    if (Array.isArray(metaCountries)) {
      return metaCountries.map((c) => this.stripAudienceQuotes(String(c)).toLowerCase());
    }
    if (metaCountry !== undefined) {
      return [this.stripAudienceQuotes(String(metaCountry)).toLowerCase()];
    }
    return [];
  }

  private userMatchesCountryConstraint(
    userProfile: UserProfileFilter,
    audienceMetadata: Record<string, unknown>,
  ): boolean {
    const allowedCountries = this.buildAllowedCountriesLower(audienceMetadata);
    if (allowedCountries.length === 0) return true;
    const userCountry = userProfile.country
      ? this.stripAudienceQuotes(userProfile.country).toLowerCase()
      : '';
    return Boolean(userCountry && allowedCountries.includes(userCountry));
  }

  private userProfileMatchesAttributeFilters(
    userProfile: UserProfileFilter | null | undefined,
    audienceMetadata: Record<string, unknown>,
  ): boolean {
    if (!userProfile) return false;
    if (!this.userMatchesCohortConstraint(userProfile, audienceMetadata)) return false;
    if (!this.userMatchesTagConstraint(userProfile, audienceMetadata)) return false;
    if (!this.userMatchesCountryConstraint(userProfile, audienceMetadata)) return false;
    return true;
  }

  /**
   * Determines if a user is in the campaign audience.
   * - ALL_USERS: everyone (subject to cohortId/auto_tags/country filter below).
   * - USER_LIST: userId in audience_metadata.userIds.
   * - COHORT/ROLE: userId in audience_metadata.resolvedUserIds.
   * - When audience_metadata has cohortId, auto_tags, or country: userProfile must be provided and must match (AND).
   */
  private isUserInAudience(
    userId: string,
    audienceType: AudienceType,
    audienceMetadata: Record<string, unknown>,
    userProfile?: UserProfileFilter | null,
  ): boolean {
    if (audienceType === 'USER_LIST') {
      const userIds = audienceMetadata?.userIds as string[] | undefined;
      return Array.isArray(userIds) && userIds.includes(userId);
    }

    const resolvedUserIds = this.getResolvedUserIds(audienceMetadata);
    if ((audienceType === 'COHORT' || audienceType === 'ROLE') && resolvedUserIds.length > 0) {
      return resolvedUserIds.includes(userId);
    }

    if (this.audienceMetadataHasAttributeFilters(audienceMetadata)) {
      return this.userProfileMatchesAttributeFilters(userProfile, audienceMetadata);
    }

    if (audienceType === 'ALL_USERS') return true;
    return resolvedUserIds.includes(userId);
  }

  async getNotifications(
    userId: string,
    limit: number = 10,
    offset: number = 0,
    type?: NotificationType,
    userProfile?: UserProfileFilter | null,
  ): Promise<InAppNotificationItem[]> {
    const qb = this.campaignRepository
      .createQueryBuilder('c')
      .leftJoin(
        'UserNotifications',
        'r',
        'r.notification_id = c.id AND r.user_id = :userId',
        { userId },
      )
      .addSelect('r.id', 'read_id')
      .addSelect('c.id')
      .addSelect('c.title')
      .addSelect('c.message')
      .addSelect('c.link')
      .addSelect('c.notification_type')
      .addSelect('c.created_at')
      .addSelect('c.audience_type')
      .addSelect('c.audience_metadata')
      .where('(c.expires_at IS NULL OR c.expires_at >= :now)', {
        now: new Date(),
      })
      .orderBy('c.created_at', 'DESC')
      .offset(offset)
      .limit(Math.max(limit * 5, 50));

    if (type) {
      qb.andWhere('c.notification_type = :type', { type });
    }

    const rows = await qb.getRawMany();

    const filtered: InAppNotificationItem[] = [];
    for (const row of rows) {
      const inAudience = this.isUserInAudience(
        userId,
        row.c_audience_type as AudienceType,
        (row.c_audience_metadata as Record<string, unknown>) || {},
        userProfile,
      );
      if (!inAudience) continue;
      filtered.push({
        id: row.c_id,
        title: row.c_title,
        message: row.c_message,
        link: row.c_link,
        notificationType: row.c_notification_type as NotificationType,
        isRead: !!row.read_id,
        createdAt: row.c_created_at instanceof Date ? row.c_created_at.toISOString() : row.c_created_at,
      });
      if (filtered.length >= limit) break;
    }

    return filtered;
  }

  async getUnreadCount(userId: string, userProfile?: UserProfileFilter | null): Promise<number> {
    if (!this.redis) {
      return this.calculateUnreadCountFromDb(userId, userProfile);
    }

    try {
      await this.ensureRedisConnected();
      const currentVersion = await this.getGlobalVersion();
      const cacheKey = this.getUnreadCacheKey(userId);
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as { count?: number; version?: number };
        if (typeof parsed?.count === 'number' && parsed.version === currentVersion) {
          return Math.max(0, parsed.count);
        }
      }

      const count = await this.calculateUnreadCountFromDb(userId, userProfile);
      await this.cacheUnreadCount(userId, count, currentVersion);
      return count;
    } catch {
      return this.calculateUnreadCountFromDb(userId, userProfile);
    }
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const result = await this.readRepository
      .createQueryBuilder()
      .insert()
      .into(InAppNotificationRead)
      .values({
        notification_id: notificationId,
        user_id: userId,
      })
      .orIgnore()
      .execute();

    const inserted = Number(result?.raw?.rowCount || 0) > 0 || (result.identifiers?.length || 0) > 0;
    if (inserted) {
      await this.decrementUnreadCacheCount(userId);
    }
  }

  async createCampaign(params: CreateInAppCampaignParams): Promise<InAppNotificationCampaign> {
    const campaign = this.campaignRepository.create({
      template_id: params.templateId ?? null,
      title: params.title,
      message: params.message,
      link: params.link,
      notification_type: params.notificationType,
      audience_type: params.audienceType,
      audience_metadata: params.audienceMetadata || {},
      created_by: params.createdBy,
      updated_by: params.updatedBy ?? null,
      expires_at: params.expiresAt ?? null,
    });
    const saved = await this.campaignRepository.save(campaign);
    await this.incrementGlobalVersion();
    return saved;
  }
}
