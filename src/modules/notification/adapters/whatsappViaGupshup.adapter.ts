import {
    BadRequestException,
    Inject,
    Injectable,
    forwardRef,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotificationServiceInterface } from "../interface/notificationService";
import { NotificationLog } from "../entity/notificationLogs.entity";
import { NotificationService } from "../notification.service";
import { LoggerUtil } from "src/common/logger/LoggerUtil";
import axios from "axios";

/**
 * Interface for raw WhatsApp data via Gupshup
 */
export interface RawWhatsappGupshupData {
    to: string; // WhatsApp number in international format
    body: string;
    from?: string;
    templateId?: string; // For template messages
    templateParams?: any[]; // For template parameters
}

@Injectable()
export class WhatsappViaGupshupAdapter implements NotificationServiceInterface {
    private readonly gupshupApiKey: string;
    private readonly gupshupChannelId: string;
    private readonly gupshupSource: string;
    private readonly gupshupApiUrl: string;

    constructor(
        @Inject(forwardRef(() => NotificationService))
        private readonly notificationServices: NotificationService,
        private readonly configService: ConfigService
    ) {
        // Initialize Gupshup configuration
        this.gupshupApiKey = this.configService.get('GUPSHUP_API_KEY');
        this.gupshupChannelId = this.configService.get('GUPSHUP_CHANNEL_ID');
        this.gupshupSource = this.configService.get('GUPSHUP_SOURCE');
        this.gupshupApiUrl = this.configService.get('GUPSHUP_API_URL', 'https://api.gupshup.io/wa/api/v1');
        
        if (!this.gupshupApiKey || !this.gupshupChannelId || !this.gupshupSource) {
            LoggerUtil.error('Gupshup WhatsApp API credentials not configured properly');
        }
    }

    /**
     * Sends WhatsApp notifications using template-based approach
     */
    async sendNotification(notificationDataArray) {
        
    }

    /**
    * Creates a raw notification log entry without requiring NotificationDto
    */
    private createRawNotificationLog(
        bodyText: string,
        recipient: string
    ): NotificationLog {
        const notificationLogs = new NotificationLog();
        notificationLogs.context = "raw-whatsapp-gupshup";
        notificationLogs.subject = null;
        notificationLogs.body = bodyText;
        notificationLogs.action = "send-raw-whatsapp-gupshup";
        notificationLogs.type = "whatsapp-gupshup";
        notificationLogs.recipient = recipient;
        return notificationLogs;
    }

    /**
    * Send WhatsApp message using Gupshup API
    */
    private async sendViaGupshupProvider({ to, body, from, templateId, templateParams }) {
        try {
            if (!this.gupshupApiKey || !this.gupshupChannelId || !this.gupshupSource) {
                throw new Error('Gupshup WhatsApp API credentials not configured. Please set GUPSHUP_API_KEY, GUPSHUP_CHANNEL_ID, and GUPSHUP_SOURCE environment variables.');
            }

            if (!from) {
                from = this.gupshupSource;
            }

            // Format phone number (remove + if present and ensure proper format)
            const formattedDestination = to.startsWith('+') ? to.substring(1) : to;
            const formattedSource = from.startsWith('+') ? from.substring(1) : from;
            
            // Prepare the message payload for Gupshup API
            let messagePayload: any = {
                source: formattedSource,
                destination: formattedDestination,
                template: JSON.stringify({
                    id: templateId,
                    params: templateParams || []
                }),
            };

            const apiUrl = `${this.gupshupApiUrl}/template/msg`;

            // Make API call to Gupshup WhatsApp API
            const response = await axios.post(apiUrl, messagePayload, {
                headers: {
                    'apikey': this.gupshupApiKey,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

            if ((response.status === 202 || response.status === 200 )&& response.data) {
                const responseData = response.data;
                
                // Check if the response indicates success
                if (responseData.status === 'submitted' || responseData.status === 'success') {
                    LoggerUtil.log('WhatsApp message sent successfully via Gupshup API');
                    return {
                        status: 'success',
                        id: responseData.messageId || `gupshup-${Date.now()}`,
                        data: responseData
                    };
                } else {
                    throw new Error(`Gupshup API returned status: ${responseData.status}`);
                }
            } else {
                throw new Error(`Gupshup API returned status: ${response.status}`);
            }
        } catch (error) {
            LoggerUtil.error('Gupshup WhatsApp API error:', error);
            
            // Handle different types of errors
            if (error.response) {
                // API error response
                const errorData = error.response.data;
                return {
                    status: 'error',
                    errors: [
                        `Gupshup API Error: ${errorData.message || errorData.error || 'Unknown error'}`,
                        `Status: ${errorData.status || error.response.status}`
                    ]
                };
            } else if (error.request) {
                // Network error
                return {
                    status: 'error',
                    errors: ['Network error: Unable to reach Gupshup API']
                };
            } else {
                // Other error
                return {
                    status: 'error',
                    errors: [error.message || 'Unknown error occurred']
                };
            }
        }
    }

    /**
     * Send template message via Gupshup
     */
    async sendTemplateMessage(templateData: {
        to: string;
        templateId: string;
        templateParams: any[];
        from?: string;
    }) {
        const notificationLogs = this.createRawNotificationLog(
            `Template: ${templateData.templateId}`,
            templateData.to
        );
        
        try {
            const result = await this.sendViaGupshupProvider({
                to: templateData.to,
                body: '', // Not used for templates
                from: templateData.from || this.configService.get('WHATSAPP_FROM'),
                templateId: templateData.templateId,
                templateParams: templateData.templateParams,
            });
            
            if (result.status === "success") {
                notificationLogs.status = true;
                await this.notificationServices.saveNotificationLogs(notificationLogs);
                LoggerUtil.log('WhatsApp template message submitted successfully via Gupshup');
                return {
                    status: 200,
                    to: templateData.to,
                    result: 'WhatsApp template message submitted successfully via Gupshup',
                    messageId: result.id || `gupshup-template-${Date.now()}`,
                };
            } else {
                throw new Error(`WhatsApp template not sent: ${JSON.stringify(result.errors)}`);
            }
        } catch (e) {
            LoggerUtil.error('WhatsApp template message failed:', e);
            notificationLogs.status = false;
            notificationLogs.error = e.toString();
            await this.notificationServices.saveNotificationLogs(notificationLogs);
            return {
                status: "error",
                errors: [e.message || e.toString()],
            };
        }
    }
} 