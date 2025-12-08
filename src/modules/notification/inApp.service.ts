import { BadRequestException, Injectable, Inject, forwardRef, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InAppNotification } from './entity/inAppNotification.entity';
import { CreateInAppNotificationDto, ListInAppNotificationsQueryDto, InAppStatus, MarkInAppReadDto } from './dto/inapp.dto';
import { NotificationService } from './notification.service';
import { NotificationLog } from './entity/notificationLogs.entity';
import { NotificationActionTemplates } from 'src/modules/notification_events/entity/notificationActionTemplates.entity';
import { NotificationActions } from 'src/modules/notification_events/entity/notificationActions.entity';

@Injectable()
export class InAppService {
  constructor(
    @InjectRepository(InAppNotification)
    private readonly inappRepo: Repository<InAppNotification>,
    @InjectRepository(NotificationActionTemplates)
    private readonly templateRepo: Repository<NotificationActionTemplates>,
    @InjectRepository(NotificationActions)
    private readonly actionsRepo: Repository<NotificationActions>,
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationService: NotificationService,
  ) {}

  async create(dto: CreateInAppNotificationDto) {
    let computedTitle = dto.title;
    let computedMessage = dto.message;
    let computedLink = dto.link;
    let resolvedTemplateId: string | undefined = dto.templateId;
    let resolvedActionId: number | undefined = undefined;

    // Choose replacements from request (prefer "replacements", fallback to "templateParams")
    const incomingReplacements: Record<string, string> = (dto as any).replacements || dto.templateParams || {};

    // If templateId is provided, render from template (type should be 'inApp' and published)
    if (dto.templateId) {
      const template = await this.templateRepo.findOne({
        where: { templateId: dto.templateId, type: 'inApp', status: 'published' },
      });
      if (!template) {
        throw new BadRequestException('In-app template not found or not published for given templateId');
      }
      const replacements = incomingReplacements;
      computedTitle = this.replacePlaceholders(template.subject || '', replacements);
      computedMessage = this.replacePlaceholders(template.body || '', replacements);
      computedLink = template.link ? this.replacePlaceholders(template.link, replacements) : dto.link;
      resolvedTemplateId = template.templateId;
    } else if (dto.key) {
      // Resolve via action by key (and optional context), then fetch inApp template (published)
      let action: NotificationActions | null = null;
      if (dto.context) {
        action = await this.actionsRepo.findOne({ where: { context: dto.context, key: dto.key, status: 'published' } });
      } else {
        const actions = await this.actionsRepo.find({ where: { key: dto.key, status: 'published' } });
        if (actions.length === 0) {
          throw new BadRequestException('Notification action not found or not published for given key');
        }
        if (actions.length > 1) {
          throw new BadRequestException('Multiple actions found for key. Please provide context.');
        }
        action = actions[0];
      }
      if (!action) {
        throw new BadRequestException('Notification action not found');
      }

      const template = await this.templateRepo.findOne({
        where: { actionId: action.actionId, type: 'inApp', status: 'published' },
      });
      if (!template) {
        throw new BadRequestException('In-app template not found or not published for resolved action');
      }
      const replacements = incomingReplacements;
      computedTitle = this.replacePlaceholders(template.subject || '', replacements);
      computedMessage = this.replacePlaceholders(template.body || '', replacements);
      computedLink = template.link ? this.replacePlaceholders(template.link, replacements) : dto.link;
      resolvedTemplateId = template.templateId;
    }

    const entity = this.inappRepo.create({
      userId: dto.userId,
      templateId: resolvedTemplateId,
      context: dto.context,
      actionKey: dto.key,
      tenant_code: dto.tenant_code,
      org_code: dto.org_code,
      title: computedTitle,
      // Persist resolved message at create time
      message: computedMessage || null,
      link: computedLink,
      metadata: dto.metadata,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      isRead: false,
    });

    console.log('dto', dto);
    const saved = await this.inappRepo.save(entity);
    console.log('saved', saved);

    const log = new NotificationLog();
    log.context = 'inApp';
    log.action = 'create';
    log.subject = computedTitle;
    log.body = (computedMessage || '').slice(0, 255);
    log.type = 'inApp';
    log.recipient = dto.userId;
    await this.notificationService.saveNotificationLogs(log);

    return saved;
  }

  private replacePlaceholders(template: string, replacements: Record<string, string>) {
    return template.replace(/{(\w+)}/g, (_full, key: string) => {
      const withBraces = `{${key}}`;
      if (Object.prototype.hasOwnProperty.call(replacements, withBraces)) {
        return replacements[withBraces];
      }
      if (Object.prototype.hasOwnProperty.call(replacements, key)) {
        return replacements[key];
      }
      return _full;
    });
  }

  async list(q: ListInAppNotificationsQueryDto) {
    const qb = this.inappRepo.createQueryBuilder('n')
      .where('n.userId = :userId', { userId: q.userId });

    if (q.status === InAppStatus.unread) {
      qb.andWhere('n.isRead = false');
    } else if (q.status === InAppStatus.read) {
      qb.andWhere('n.isRead = true');
    }

    qb.orderBy('n.createdAt', 'DESC');

    if (q.limit === 0) {
      const count = await qb.getCount();
      return { count };
    }

    const limit = q.limit || 20;
    const offset = (q.offset !== undefined && q.offset !== null) ? q.offset : (((q.page || 1) - 1) * limit);
    const [rows, count] = await qb.skip(offset).take(limit).getManyAndCount();

    // Return stored title/message/link directly; do not re-render
    const data = rows;

    return { data, count, offset, limit };
  }

  async markRead(dto: MarkInAppReadDto) {
    if (dto.notificationId && dto.markAll) {
      throw new BadRequestException('Provide either notificationId OR markAll=true with userId, not both.');
    }

    if (dto.notificationId) {
      const result = await this.inappRepo.update(
        { id: dto.notificationId, isRead: false },
        { isRead: true, readAt: () => 'NOW()' },
      );
      if (!result.affected || result.affected === 0) {
        throw new NotFoundException('Notification not found or already read');
      }

      // write log for single mark-read
      const log = new NotificationLog();
      log.context = 'inApp';
      log.action = 'mark-read-single';
      log.subject = 'InApp Notification Read';
      log.body = `Notification ${dto.notificationId} marked as read`;
      log.type = 'inApp';
      log.recipient = dto.userId || ''; // may be undefined for single; keep empty if not provided
      await this.notificationService.saveNotificationLogs(log);

      return { updated: result.affected, message: 'Notification marked as read' };
    }

    if (dto.markAll) {
      if (!dto.userId) throw new BadRequestException('userId is required when markAll=true.');
      const res = await this.inappRepo
        .createQueryBuilder()
        .update(InAppNotification)
        .set({ isRead: true, readAt: () => 'NOW()' })
        .where('userId = :userId', { userId: dto.userId })
        .andWhere('isRead = false')
        .execute();

      // write log for bulk mark-read
      const bulkLog = new NotificationLog();
      bulkLog.context = 'inApp';
      bulkLog.action = 'mark-read-all';
      bulkLog.subject = 'InApp Notifications Read';
      bulkLog.body = `Marked ${res.affected || 0} notifications as read for user ${dto.userId}`;
      bulkLog.type = 'inApp';
      bulkLog.recipient = dto.userId;
      await this.notificationService.saveNotificationLogs(bulkLog);

      return { updated: res.affected || 0, message: 'All notifications marked as read for user' };
    }

    throw new BadRequestException('Invalid payload: provide notificationId OR { userId, markAll: true }.');
  }
}


