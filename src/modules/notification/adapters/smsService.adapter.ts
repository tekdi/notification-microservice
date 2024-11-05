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
import { LoggerUtil } from "src/common/logger/LoggerUtil";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "src/common/utils/constant.util";
@Injectable()
export class SmsAdapter implements NotificationServiceInterface {

    private readonly accountSid;
    private readonly authToken;
    private readonly smsFrom;

    constructor(
        @Inject(forwardRef(() => NotificationService)) private readonly notificationServices: NotificationService,
        private readonly configService: ConfigService,
        @InjectRepository(NotificationActions)
        private notificationEventsRepo: Repository<NotificationActions>,
        @InjectRepository(NotificationActionTemplates)
        private notificationTemplateConfigRepository: Repository<NotificationActionTemplates>,
    ) {
        this.accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
        this.authToken = this.configService.get('TWILIO_AUTH_TOKEN');
        this.smsFrom = this.configService.get('SMS_FROM');
        console.log("accountSid=", this.accountSid, "authToken=", this.authToken, "smsFrom=", this.smsFrom);
    }
    async sendNotification(notificationDataArray) {
        const results = [];
        for (const notificationData of notificationDataArray) {
            try {
                console.log("accountSid1=", this.accountSid, "authToken1=", this.authToken, "smsFrom1=", this.smsFrom);
                const recipient = notificationData.recipient;
                if (!this.isValidMobileNumber(recipient)) {
                    throw new BadRequestException(ERROR_MESSAGES.INVALID_MOBILE_NUMBER);
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
                    status: 200,
                    result: SUCCESS_MESSAGES.SMS_NOTIFICATION_SEND_SUCCESSFULLY,
                });
            } catch (error) {
                LoggerUtil.error('Failed to send SMS notification', error);
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
                from: `${this.smsFrom}`,
                to: `+91${notificationData.recipient}`,
                body: notificationData.body,
            });
            LoggerUtil.error(SUCCESS_MESSAGES.SMS_NOTIFICATION_SEND_SUCCESSFULLY);
            notificationLogs.status = true;
            await this.notificationServices.saveNotificationLogs(notificationLogs);
            return message;
        } catch (error) {
            LoggerUtil.error(ERROR_MESSAGES.SMS_NOTIFICATION_FAILED, error);
            notificationLogs.status = false;
            notificationLogs.error = error.toString();
            await this.notificationServices.saveNotificationLogs(notificationLogs);
            throw error;
        }
    }
}
