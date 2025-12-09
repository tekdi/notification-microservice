import { Injectable } from '@nestjs/common';
import { NotificationServiceInterface } from './interface/notificationService';
import { EmailAdapter } from './adapters/emailService.adapter';
import { PushAdapter } from './adapters/pushService.adapter';
import { SmsAdapter } from './adapters/smsService.adapter';
import { InAppAdapter } from './adapters/inApp.adapter';

@Injectable()
export class NotificationAdapterFactory {
    constructor(
        private readonly emailAdapter: EmailAdapter,
        private readonly pushAdapter: PushAdapter,
        private readonly smsAdapter: SmsAdapter,
        private readonly inAppAdapter: InAppAdapter,
    ) { }

    getAdapter(notificationType: string): NotificationServiceInterface {
        switch (notificationType) {
            case 'email':
                return this.emailAdapter;
            case 'push':
                return this.pushAdapter;
            case 'sms':
                return this.smsAdapter;
            case 'inApp':
                return this.inAppAdapter;
            default:
                throw new Error('Invalid notification type.');
        }
    }
}
