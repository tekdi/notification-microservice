import { Injectable } from '@nestjs/common';
import { NotificationServiceInterface } from './interface/notificationService';
import { EmailAdapter } from './adapters/emailService.adapter';
import { PushAdapter } from './adapters/pushService.adapter';
import { ConfigService } from '@nestjs/config';
import { TwilioSmsAdapter } from './adapters/sms/twilioSmsService.adapter';
import { AwsSmsAdapter } from './adapters/sms/awsSmsService.adapter';
import { Msg91SmsServiceAdapter } from './adapters/sms/msg91SmsService.adapter';

@Injectable()
export class NotificationAdapterFactory {
    constructor(
        private readonly configService: ConfigService,
        private readonly emailAdapter: EmailAdapter,
        private readonly pushAdapter: PushAdapter,
        private readonly twilioSmsAdapter: TwilioSmsAdapter,
        private readonly awsSmsAdapter: AwsSmsAdapter,
        private readonly msg91SmsAdapter: Msg91SmsServiceAdapter,
    ) { }

    getAdapter(notificationType: string): NotificationServiceInterface {
        switch (notificationType) {
            case 'email':
                return this.emailAdapter;
            case 'push':
                return this.pushAdapter;
            case 'sms':
                return this.getSmsAdapter();
            default:
                throw new Error('Invalid notification type.');
        }
    }


    private getSmsAdapter(): NotificationServiceInterface {
        const provider = this.configService.get('SMS_ADAPTER'); // set in env

        switch (provider) {
            case 'TWILIO':
                return this.twilioSmsAdapter;
            case 'AWS':
                return this.awsSmsAdapter;
            case 'MSG91':
                return this.msg91SmsAdapter;
            default:
                throw new Error('Invalid SMS provider.');
        }
    }
}
