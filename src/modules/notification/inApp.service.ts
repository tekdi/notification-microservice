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
    const replacements = (dto as any).replacements || {};
    const { title, message, link } = await this.resolveContent(dto, replacements);

    const entity = this.inappRepo.create({
      userId: dto.userId,
      context: dto.context,
      actionKey: dto.key,
      tenant_code: dto.tenant_code,
      org_code: dto.org_code,
      title,
      message: message || null,
      link,
      metadata: dto.metadata,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      isRead: false,
    });

    const saved = await this.inappRepo.save(entity);

    const log = new NotificationLog();
    log.context = 'inApp';
    log.action = 'create';
    log.subject = title;
    log.body = (message || '').slice(0, 255);
    log.type = 'inApp';
    log.recipient = dto.userId;
    await this.notificationService.saveNotificationLogs(log);

    return saved;
  }

  private async resolveContent(
    dto: CreateInAppNotificationDto,
    replacements: Record<string, string>,
  ): Promise<{ title: string; message: string | undefined; link?: string }> {
    if (dto.key) {
      const action = await this.findPublishedAction(dto.context, dto.key);
      const template = await this.findPublishedTemplateForAction(action.actionId);
      return this.renderTemplate(template, replacements, dto.link);
    }
    this.ensureRawContent(dto);
    return { title: dto.title, message: dto.message, link: dto.link };
  }

  private async findPublishedAction(
    context: string | undefined,
    key: string,
  ): Promise<NotificationActionTemplates['template']> {
    if (context) {
      const action = await this.actionsRepo.findOne({ where: { context, key, status: 'published' } });
      if (!action) {
        throw new BadRequestException('Notification action not found or not published for given context/key');
      }
      return action;
    }
    const actions = await this.actionsRepo.find({ where: { key, status: 'published' } });
    if (actions.length === 0) {
      throw new BadRequestException('Notification action not found or not published for given key');
    }
    if (actions.length > 1) {
      throw new BadRequestException('Multiple actions found for key. Please provide context.');
    }
    return actions[0];
  }

  private async findPublishedTemplateForAction(actionId: number): Promise<NotificationActionTemplates> {
    const template = await this.templateRepo.findOne({
      where: { actionId, type: 'inApp', status: 'published' },
    });
    if (!template) {
      throw new BadRequestException('In-app template not found or not published for resolved action');
    }
    return template;
  }

  private renderTemplate(
    template: NotificationActionTemplates,
    replacements: Record<string, string>,
    fallbackLink?: string,
  ): { title: string; message: string; link?: string } {
    const title = this.replacePlaceholders(template.subject || '', replacements);
    const message = this.replacePlaceholders(template.body || '', replacements);
    const link = template.link ? this.replacePlaceholders(template.link, replacements) : fallbackLink;
    return { title, message, link };
  }

  private ensureRawContent(
    dto: CreateInAppNotificationDto,
  ): asserts dto is CreateInAppNotificationDto & { title: string; message: string } {
    if (!dto.title || !dto.message) {
      throw new BadRequestException('Either key (with replacements) or raw title and message are required');
    }
  }

  private replacePlaceholders(template: string, replacements: Record<string, string>) {
    return template
      .split(/({\w+})/g) // split but keep tokens
      .map((token) => {
        if (replacements[token]) return replacements[token];
        const stripped = token.replace(/[{}]/g, ''); // compatible with ES2015 target
        if (replacements[stripped]) return replacements[stripped];
        return token;
      })
      .join("");
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
    // If offset is explicitly used (including >0), honor it.
    // If offset is 0 BUT page > 1, treat it as "offset not provided" and derive from page.
    const useOffsetDirectly = !(q.offset === 0 && q.page && q.page > 1);
    const offset = useOffsetDirectly ? (q.offset ?? 0) : (((q.page || 1) - 1) * limit);
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


