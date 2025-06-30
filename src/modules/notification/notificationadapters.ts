import { Injectable } from '@nestjs/common';
import { NotificationServiceInterface } from './interface/notificationService';
import { EmailAdapter } from './adapters/emailService.adapter';
import { PushAdapter } from './adapters/pushService.adapter';
import { SmsAdapter } from './adapters/smsService.adapter';
import { WhatsappAdapter } from './adapters/whatsappService.adapter';
import { WhatsappViaGupshupAdapter } from './adapters/whatsappViaGupshup.adapter';
import { ConfigService } from '@nestjs/config';
import { WHATSAPP_PROVIDER } from 'src/common/utils/constant.util';

@Injectable()
export class NotificationAdapterFactory {
    private readonly whatsappProvider: string;

    constructor(
        private readonly emailAdapter: EmailAdapter,
        private readonly pushAdapter: PushAdapter,
        private readonly smsAdapter: SmsAdapter,
        private readonly whatsappAdapter: WhatsappAdapter,
        private readonly whatsappViaGupshupAdapter: WhatsappViaGupshupAdapter,
        private readonly configService: ConfigService,
    ) {
        this.whatsappProvider = this.configService.get('WHATSAPP_PROVIDER', WHATSAPP_PROVIDER.META);
    }

    getAdapter(notificationType: string): NotificationServiceInterface {
        switch (notificationType) {
            case 'email':
                return this.emailAdapter;
            case 'push':
                return this.pushAdapter;
            case 'sms':
                return this.smsAdapter;
            case 'whatsapp':
                // Choose WhatsApp provider based on environment configuration
                if (this.whatsappProvider === WHATSAPP_PROVIDER.GUPSHUP) {
                    return this.whatsappViaGupshupAdapter;
                } else {
                    return this.whatsappAdapter; // Default to Meta WhatsApp API
                }
            default:
                throw new Error('Invalid notification type.');
        }
    }

    /**
     * Get specific WhatsApp adapter by provider
     */
    getWhatsappAdapter(provider?: string): NotificationServiceInterface {
        const whatsappProvider = provider || this.whatsappProvider;
        
        switch (whatsappProvider) {
            case WHATSAPP_PROVIDER.GUPSHUP:
                return this.whatsappViaGupshupAdapter;
            case WHATSAPP_PROVIDER.META:
            case WHATSAPP_PROVIDER.TWILIO:
                return this.whatsappAdapter;
            default:
                return this.whatsappAdapter; // Default to Meta WhatsApp API
        }
    }
}
