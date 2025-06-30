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
 * Interface for raw WhatsApp data
 */
export interface RawWhatsappData {
    to: string; // WhatsApp number in international format
    body: string;
    from?: string;
}

@Injectable()
export class WhatsappAdapter implements NotificationServiceInterface {
    private readonly whatsappProvider: string;
    private readonly whatsappAccessToken: string;
    private readonly whatsappPhoneNumberId: string;
    private readonly whatsappApiVersion: string;
    private readonly whatsappApiBaseUrl: string;

    constructor(
        @Inject(forwardRef(() => NotificationService))
        private readonly notificationServices: NotificationService,
        private readonly configService: ConfigService
    ) {
        // Determine WhatsApp provider from environment
        this.whatsappProvider = this.configService.get('WHATSAPP_PROVIDER', WHATSAPP_PROVIDER.META);
        
        // Initialize WhatsApp Business API configuration
        this.whatsappAccessToken = this.configService.get('WHATSAPP_ACCESS_TOKEN');
        this.whatsappPhoneNumberId = this.configService.get('WHATSAPP_PHONE_NUMBER_ID');
        this.whatsappApiVersion = this.configService.get('WHATSAPP_API_VERSION', 'v18.0');
        this.whatsappApiBaseUrl = `https://graph.facebook.com/${this.whatsappApiVersion}`;
        
        if (!this.whatsappAccessToken || !this.whatsappPhoneNumberId) {
            LoggerUtil.error('WhatsApp Business API credentials not configured properly');
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
                        messageId: (result && 'messageId' in result && result.messageId) || (result && 'id' in result && result.id) || `whatsapp-${Date.now()}`,
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
        notificationLogs.type = "whatsapp";
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
        notificationLogs.context = "raw-whatsapp";
        notificationLogs.subject = null;
        notificationLogs.body = bodyText;
        notificationLogs.action = "send-raw-whatsapp";
        notificationLogs.type = "whatsapp";
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
            const result = await this.sendViaWhatsappProvider({
                to: notificationData.recipient,
                body: notificationData.body,
                from: this.configService.get('WHATSAPP_FROM'),
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
    async sendRawMessage(messageData: RawWhatsappData) {
        const notificationLogs = this.createRawNotificationLog(
            messageData.body,
            messageData.to
        );
        try {
            const result = await this.sendViaWhatsappProvider({
                to: messageData.to,
                body: messageData.body,
                from: messageData.from || this.configService.get('WHATSAPP_FROM'),
            });
            if (result.status === "success") {
                notificationLogs.status = true;
                await this.notificationServices.saveNotificationLogs(notificationLogs);
                LoggerUtil.log(
                    SUCCESS_MESSAGES.WHATSAPP_NOTIFICATION_SEND_SUCCESSFULLY
                );
                return {
                    ...result,
                    messageId: result.id || `whatsapp-${Date.now()}`,
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
    * Send WhatsApp message using official WhatsApp Business API
    */
    private async sendViaWhatsappProvider({ to, body, from }) {
        try {
            // Get WhatsApp credentials from environment
            const whatsappAccessToken = this.configService.get('WHATSAPP_ACCESS_TOKEN');
            const whatsappPhoneNumberId = this.configService.get('WHATSAPP_PHONE_NUMBER_ID');
            const whatsappApiVersion = this.configService.get('WHATSAPP_API_VERSION', 'v18.0');
            
            if (!whatsappAccessToken || !whatsappPhoneNumberId) {
                throw new Error('WhatsApp Business API credentials not configured. Please set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID environment variables.');
            }

            // Format phone number (remove + if present and ensure proper format)
            const formattedPhone = to.startsWith('+') ? to.substring(1) : to;

            // Prepare the message payload for WhatsApp Business API
            const messagePayload = {
                messaging_product: "whatsapp",
                to: formattedPhone,
                type: "text",
                text: {
                    body: body
                }
            };

            const apiUrl = `https://graph.facebook.com/${whatsappApiVersion}/${whatsappPhoneNumberId}/messages`;

            // Make API call to WhatsApp Business API
            const response = await axios.post(apiUrl, messagePayload, {
                headers: {
                    'Authorization': `Bearer ${whatsappAccessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 200 && response.data) {
                LoggerUtil.log('WhatsApp message sent successfully via Business API');
                return {
                    status: 'success',
                    id: response.data.messages?.[0]?.id || `whatsapp-${Date.now()}`,
                    data: response.data
                };
            } else {
                throw new Error(`WhatsApp API returned status: ${response.status}`);
            }
        } catch (error) {
            LoggerUtil.error('WhatsApp Business API error:', error);
            
            // Handle different types of errors
            if (error.response) {
                // API error response
                const errorData = error.response.data;
                return {
                    status: 'error',
                    errors: [
                        `WhatsApp API Error: ${errorData.error?.message || errorData.error?.type || 'Unknown error'}`,
                        `Code: ${errorData.error?.code || error.response.status}`
                    ]
                };
            } else if (error.request) {
                // Network error
                return {
                    status: 'error',
                    errors: ['Network error: Unable to reach WhatsApp API']
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
}
