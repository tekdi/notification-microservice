import { Injectable } from '@nestjs/common';
import { NotificationServiceInterface } from '../interface/notificationService';
import { InAppService } from '../inApp.service';

export interface InAppNotificationData {
  recipient: string;
  context?: string;
  key?: string;
  replacements?: Record<string, string>;
  link?: string;
  metadata?: any;
  tenant_code?: string;
  org_code?: string;
}

export interface NotificationResult {
  recipient: string;
  status: number;
  id?: string;
  error?: string;
}

@Injectable()
export class InAppAdapter implements NotificationServiceInterface {
  constructor(private readonly inAppService: InAppService) {}

  async sendNotification(notificationDataArray: InAppNotificationData[]): Promise<NotificationResult[]> {
    const tasks = notificationDataArray.map(async (n) => {
      try {
        const saved = await this.inAppService.create({
          userId: n.recipient,
          context: n.context,
          key: n.key,
          replacements: n.replacements,
          link: n.link,
          metadata: n.metadata,
          tenant_code: n.tenant_code,
          org_code: n.org_code,
        });
        return { recipient: n.recipient, status: 200, id: (saved as any).id } as NotificationResult;
      } catch (error: any) {
        return {
          recipient: n.recipient,
          status: typeof error?.status === 'number' ? error.status : 500,
          error: error?.message ?? 'Unknown error',
        } as NotificationResult;
      }
    });
    return Promise.all(tasks);
  }
}


