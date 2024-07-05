import { BadRequestException, Inject, Injectable, forwardRef } from "@nestjs/common";
import { NotificationServiceInterface } from "../interface/notificationService";
import { NotificationDto } from "../dto/notificationDto.dto";
import { NotificationActions } from "src/modules/notification_events/entity/notificationActions.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotificationActionTemplates } from "src/modules/notification_events/entity/notificationActionTemplates.entity"
import { ConfigService } from "@nestjs/config";
import { NotificationLog } from "../entity/notificationLogs.entity";
import { NotificationService } from "../notification.service";
import { LoggerService } from "src/common/logger/logger.service";
@Injectable()
export class SmsAdapter implements NotificationServiceInterface {

    private readonly accountSid;
    private readonly authToken;

    constructor(
        @Inject(forwardRef(() => NotificationService)) private readonly notificationServices: NotificationService,
        private readonly configService: ConfigService,
        @InjectRepository(NotificationActions)
        private notificationEventsRepo: Repository<NotificationActions>,
        @InjectRepository(NotificationActionTemplates)
        private notificationTemplateConfigRepository: Repository<NotificationActionTemplates>,
        private logger: LoggerService
    ) {
        this.accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
        this.authToken = this.configService.get('TWILIO_AUTH_TOKEN');
    }
    async sendNotification(notificationDataArray) {
        const results = [];
        for (const notificationData of notificationDataArray) {
            try {
                const recipient = notificationData.recipient;
                if (!this.isValidMobileNumber(recipient)) {
                    throw new BadRequestException('Invalid Mobile Number');
                }
                const smsNotificationDto = {
                    body: notificationData.body,
                    recipient: recipient,
                    context: notificationData.context,
                    key: notificationData.key,
                    subject: notificationData.subject,
                };
                const result = await this.send(smsNotificationDto);
                // return result;
                results.push({
                    recipient: recipient,
                    status: 'success',
                    result: "SMS notification sent successfully",
                });
            } catch (error) {
                this.logger.error('Failed to send SMS notification', error);
                results.push({
                    recipient: notificationData.recipient,
                    status: 'error',
                    error: `SMS not sent: ${JSON.stringify(error)}`,
                });
            }
        }
        return results;
    }

    private isValidMobileNumber(mobileNumber: string) {
        const regexExpForMobileNumber = /^[6-9]\d{9}$/gi;
        return regexExpForMobileNumber.test(mobileNumber);
    }
    private createNotificationLog(notificationDto: NotificationDto, subject, key, body, receipients: string): NotificationLog {
        const notificationLogs = new NotificationLog()
        notificationLogs.context = notificationDto.context;
        notificationLogs.subject = subject;
        notificationLogs.body = body;
        notificationLogs.action = key
        notificationLogs.type = 'sms';
        notificationLogs.recipient = receipients;
        return notificationLogs;
    }
    async send(notificationData) {
        const notificationLogs = this.createNotificationLog(notificationData, notificationData.subject, notificationData.key, notificationData.body, notificationData.recipient);
        try {
            const twilio = require('twilio');
            const client = twilio(this.accountSid, this.authToken);
            const message = await client.messages.create({
                from: '+12563056567',
                to: `+91${notificationData.recipient}`,
                body: notificationData.body,
            });
            this.logger.log('SMS notification sent successfully');
            notificationLogs.status = true;
            await this.notificationServices.saveNotificationLogs(notificationLogs);
            return message;
        } catch (error) {
            this.logger.error('Failed to Send SMS Notification', error, '/Not able to send Notification');
            notificationLogs.status = false;
            notificationLogs.error = error.toString();
            await this.notificationServices.saveNotificationLogs(notificationLogs);
            throw error;
        }
    }
}
