import {
    BadRequestException,
    Inject,
    Injectable,
    forwardRef,
} from "@nestjs/common";
import { NotificationServiceInterface } from "../interface/notificationService";
import { NotificationDto } from "../dto/notificationDto.dto";
import { NotificationLog } from "../entity/notificationLogs.entity";
import { NotificationService } from "../notification.service";
import { LoggerUtil } from "src/common/logger/LoggerUtil";
import {
    ERROR_MESSAGES,
    SUCCESS_MESSAGES,
} from "src/common/utils/constant.util";

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
    constructor(
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationServices: NotificationService
    ) {}

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
        // Replace this with your WhatsApp provider logic (e.g., Twilio, Gupshup, etc.)
        const result = await this.sendViaWhatsappProvider({
        to: notificationData.recipient,
        body: notificationData.body,
        from: process.env.WHATSAPP_FROM,
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
        // Replace this with your WhatsApp provider logic
        const result = await this.sendViaWhatsappProvider({
        to: messageData.to,
        body: messageData.body,
        from: messageData.from || process.env.WHATSAPP_FROM,
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
    * Replace this method with actual WhatsApp provider integration
    */
    private async sendViaWhatsappProvider({ to, body, from }) {
    // Example: Use Twilio, Gupshup, etc.
    // This is a stub. Replace with real API call.
    // Return { status: 'success', id: '...' } or { status: 'error', errors: [...] }
    try {
        // await whatsappProvider.send({ to, body, from });
        return { status: "success", id: `whatsapp-${Date.now()}` };
    } catch (e) {
        return { status: "error", errors: [e.message || e.toString()] };
    }
    }
}
