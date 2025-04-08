import { BadRequestException, forwardRef, Inject, Injectable } from "@nestjs/common";
import { NotificationServiceInterface } from "../../interface/notificationService";
import { ConfigService } from "@nestjs/config";
import { NotificationLog } from "../../entity/notificationLogs.entity";
import { NotificationDto } from "../../dto/notificationDto.dto";
import { LoggerUtil } from "src/common/logger/LoggerUtil";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "src/common/utils/constant.util";
import axios from "axios";
import { NotificationService } from "../../notification.service";

@Injectable()
export class Msg91SmsServiceAdapter implements NotificationServiceInterface {
    private readonly authKey;
    private readonly msg91url;

    constructor(
        @Inject(forwardRef(() => NotificationService)) private readonly notificationServices: NotificationService,
        private readonly configService: ConfigService,
    ) {
        this.authKey = this.configService.get('MSG91_AUTH_KEY');
        this.msg91url = this.configService.get('MSG91_URL');
    }

    async sendNotification(notificationDataArray) {
        const results = [];
        for (const notificationData of notificationDataArray) {
            try {
                const recipient = notificationData.recipient;
                if (!this.isValidMobileNumber(recipient)) {
                    throw new BadRequestException(ERROR_MESSAGES.INVALID_MOBILE_NUMBER);
                }
                this.createReplacements(notificationData.replacements)
                const smsNotificationDto = {
                    body: notificationData.body,
                    recipient: recipient,
                    context: notificationData.context,
                    key: notificationData.key,
                    subject: notificationData.subject,
                    replacements: notificationData.replacements,
                };

                const result = await this.send(smsNotificationDto);

                if (result.data.type !== 'success') {
                    throw new BadRequestException(ERROR_MESSAGES.SMS_NOTIFICATION_FAILED);
                }
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

    private createNotificationLog(notificationDto: NotificationDto, subject, key, body, recipient: string): NotificationLog {
        const notificationLogs = new NotificationLog();
        notificationLogs.context = notificationDto.context;
        notificationLogs.subject = subject;
        notificationLogs.body = body;
        notificationLogs.action = key;
        notificationLogs.type = 'sms';
        notificationLogs.recipient = recipient;
        return notificationLogs;
    }

    async send(notificationData) {
        const notificationLogs = this.createNotificationLog(
            notificationData,
            notificationData.subject,
            notificationData.key,
            notificationData.body,
            notificationData.recipient
        );
        try {
            const response = await axios.post(this.msg91url, {
                template_id: notificationData.key,
                recipients: [
                    {
                        mobiles: `91${notificationData.recipient}`,
                        ...notificationData.replacements
                    }
                ]
            }, {
                headers: {
                    "Content-Type": "application/json",
                    accept: "application/json",
                    authkey: this.authKey,
                },
            });
            LoggerUtil.log(SUCCESS_MESSAGES.SMS_NOTIFICATION_SEND_SUCCESSFULLY);
            notificationLogs.status = true;
            await this.notificationServices.saveNotificationLogs(notificationLogs);
            return response;
        } catch (error) {
            LoggerUtil.error(ERROR_MESSAGES.SMS_NOTIFICATION_FAILED, error);
            notificationLogs.status = false;
            notificationLogs.error = error.toString();
            await this.notificationServices.saveNotificationLogs(notificationLogs);
            throw error;
        }
    }


    private removeCurlyBraces(str: string): string {
        const match = str.match(/^{(.+)}$/);
        return match ? match[1] : null;
    }

    private createReplacements(replacementObj) {
        // Create replacements compatible with Msg91
        Object.keys(replacementObj).forEach((key) => {
            delete Object.assign(replacementObj, { [this.removeCurlyBraces(key)]: replacementObj[key] })[key];
        })
    }
}