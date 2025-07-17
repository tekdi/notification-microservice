import {
    BadRequestException,
    Inject,
    Injectable,
    forwardRef,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NotificationServiceInterface } from "../interface/notificationService";
import { NotificationDto } from "../dto/notificationDto.dto";
import { NotificationLog } from "../entity/notificationLogs.entity";
import { NotificationService } from "../notification.service";
import { LoggerUtil } from "src/common/logger/LoggerUtil";
import {
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
    WHATSAPP_PROVIDER,
} from "src/common/utils/constant.util";
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

/**
 * Interface for Gupshup API response
 */
interface GupshupApiResponse {
    status: string;
    messageId?: string;
    error?: string;
    details?: any;
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
        const results = [];
        for (const notificationData of notificationDataArray) {
            try {
                const recipient = notificationData.recipient;
                if (!recipient || !this.isValidPhone(recipient)) {
                    throw new BadRequestException(ERROR_MESSAGES.INVALID_PHONE);
                }
                const result = await this.send(notificationData);
                if (result.status === "success") {
                    results.push({
                        recipient: recipient,
                        status: 200,
                        result: SUCCESS_MESSAGES.WHATSAPP_NOTIFICATION_SEND_SUCCESSFULLY,
                    });
                } else {
                    results.push({
                        recipient: recipient,
                        status: "error",
                        error: `WhatsApp not sent: ${JSON.stringify(result.errors)}`,
                    });
                }
            } catch (error) {
                LoggerUtil.error(ERROR_MESSAGES.WHATSAPP_NOTIFICATION_FAILED, error);
                results.push({
                    recipient: notificationData.recipient,
                    status: "error",
                    error: error.toString(),
                });
            }
        }
        return results;
    }

    /**
     * New method for sending raw WhatsApp messages without templates
     */
    async sendRawMessages(messageData) {
        const results = [];
        const messageDataArray = Array.isArray(messageData)
            ? messageData
            : [messageData];
        for (const singleMessageData of messageDataArray) {
            try {
                if (!singleMessageData.to || !this.isValidPhone(singleMessageData.to)) {
                    throw new BadRequestException(ERROR_MESSAGES.INVALID_PHONE);
                }
                if (!singleMessageData.body) {
                    throw new BadRequestException("Message body is required");
                }
                const result = await this.sendRawMessage(singleMessageData);
                if (result.status === "success") {
                    results.push({
                        to: singleMessageData.to,
                        status: 200,
                        result: SUCCESS_MESSAGES.WHATSAPP_NOTIFICATION_SEND_SUCCESSFULLY,
                        messageId: (result && 'messageId' in result && result.messageId) || (result && 'id' in result && result.id) || `whatsapp-gupshup-${Date.now()}`,
                    });
                } else {
                    results.push({
                        to: singleMessageData.to,
                        status: 400,
                        error: `WhatsApp not sent: ${JSON.stringify(result.errors)}`,
                    });
                }
            } catch (error) {
                LoggerUtil.error(ERROR_MESSAGES.WHATSAPP_NOTIFICATION_FAILED, error);
                results.push({
                    recipient: singleMessageData.to,
                    status: 500,
                    error: error.message || error.toString(),
                });
            }
        }
        return results;
    }

    /**
    * Creates a notification log entry
    */
    private createNotificationLog(
        notificationDto: NotificationDto,
        bodyText: string,
        recipient: string
    ): NotificationLog {
        const notificationLogs = new NotificationLog();
        notificationLogs.context = notificationDto.context;
        notificationLogs.subject = null;
        notificationLogs.body = bodyText;
        notificationLogs.action = notificationDto.key;
        notificationLogs.type = "whatsapp-gupshup";
        notificationLogs.recipient = recipient;
        return notificationLogs;
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
    * Validates phone number format (simple international format)
    */
    private isValidPhone(phone: string) {
        const phoneRegexp = /^\+[1-9]\d{1,14}$/;
        return phoneRegexp.test(phone);
    }

    /**
    * Sends template-based WhatsApp message
    */
    async send(notificationData) {
        const notificationLogs = this.createNotificationLog(
            notificationData,
            notificationData.body,
            notificationData.recipient
        );
        try {
            const result = await this.sendViaGupshupProvider({
                to: notificationData.recipient,
                body: notificationData.body,
                from: this.configService.get('WHATSAPP_FROM'),
                templateId: "ddd5f61e-0004-4f57-9ecf-6f52aa55ac1a",
                templateParams: ["123456"],
            });
            if (result.status === "success") {
                notificationLogs.status = true;
                await this.notificationServices.saveNotificationLogs(notificationLogs);
                LoggerUtil.log(
                    SUCCESS_MESSAGES.WHATSAPP_NOTIFICATION_SEND_SUCCESSFULLY
                );
                return result;
            } else {
                throw new Error(`WhatsApp not sent: ${JSON.stringify(result.errors)}`);
            }
        } catch (e) {
            LoggerUtil.error(ERROR_MESSAGES.WHATSAPP_NOTIFICATION_FAILED, e);
            notificationLogs.status = false;
            notificationLogs.error = e.toString();
            await this.notificationServices.saveNotificationLogs(notificationLogs);
            return {
                status: "error",
                errors: [e.message || e.toString()],
            };
        }
    }

    /**
    * Sends raw WhatsApp message without template
    */
    async sendRawMessage(messageData: RawWhatsappGupshupData) {
        const notificationLogs = this.createRawNotificationLog(
            messageData.body,
            messageData.to
        );
        try {
            const result = await this.sendViaGupshupProvider({
                to: messageData.to,
                body: messageData.body,
                from: messageData.from || this.configService.get('WHATSAPP_FROM'),
                templateId: messageData.templateId,
                templateParams: messageData.templateParams,
            });
            if (result.status === "success") {
                notificationLogs.status = true;
                await this.notificationServices.saveNotificationLogs(notificationLogs);
                LoggerUtil.log(
                    SUCCESS_MESSAGES.WHATSAPP_NOTIFICATION_SEND_SUCCESSFULLY
                );
                return {
                    ...result,
                    messageId: result.id || `whatsapp-gupshup-${Date.now()}`,
                };
            } else {
                throw new Error(`WhatsApp not sent: ${JSON.stringify(result.errors)}`);
            }
        } catch (e) {
            LoggerUtil.error(ERROR_MESSAGES.WHATSAPP_NOTIFICATION_FAILED, e);
            notificationLogs.status = false;
            notificationLogs.error = e.toString();
            await this.notificationServices.saveNotificationLogs(notificationLogs);
            return {
                status: "error",
                errors: [e.message || e.toString()],
            };
        }
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

            messagePayload.message = JSON.stringify(messagePayload.message);

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
                LoggerUtil.log('WhatsApp template message sent successfully via Gupshup');
                return {
                    status: 200,
                    to: templateData.to,
                    result: 'WhatsApp template message sent successfully via Gupshup',
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