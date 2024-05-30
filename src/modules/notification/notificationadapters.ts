import { Injectable } from '@nestjs/common';
import { NotificationService } from './interface/notificationService';
import { EmailAdapter } from './adapters/emailService.adapter';
import { PushAdapter } from './adapters/pushService.adapter';
import { SmsAdapter } from './adapters/smsService.adapter';

@Injectable()
export class NotificationAdapterFactory {
    constructor(
        private readonly emailAdapter: EmailAdapter,
        private readonly pushAdapter: PushAdapter,
        private readonly smsAdapter: SmsAdapter,
    ) { }

    getAdapter(notificationType: string): NotificationService {
        switch (notificationType) {
            case 'email':
                return this.emailAdapter;
            case 'push':
                return this.pushAdapter;
            case 'sms':
                return this.smsAdapter;
            default:
                throw new Error('Invalid notification type.');
        }
    }
}
