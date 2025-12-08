import { Injectable } from '@nestjs/common';
import { NotificationServiceInterface } from '../interface/notificationService';
import { InAppService } from '../inApp.service';

@Injectable()
export class InAppAdapter implements NotificationServiceInterface {
  constructor(private readonly inAppService: InAppService) {}

  async sendNotification(notificationDataArray) {
    const results = [];
    for (const n of notificationDataArray) {
      const saved = await this.inAppService.create({
        userId: n.recipient,               // recipient is the userId for in-app
        context: n.context,                // forwarded from notificationDto
        key: n.key,                        // forwarded from notificationDto
        replacements: n.replacements,      // forwarded from notificationDto
        link: n.link,
        metadata: n.metadata,
        tenant_code: n.tenant_code,
        org_code: n.org_code,
      } as any);
      results.push({ recipient: n.recipient, status: 200, id: saved.id });
    }
    return results;
  }
}


