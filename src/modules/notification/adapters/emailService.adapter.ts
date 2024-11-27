import { BadRequestException, Inject, Injectable, forwardRef } from "@nestjs/common";
import { NotificationServiceInterface } from "../interface/notificationService";
import { NotificationDto } from "../dto/notificationDto.dto";
import { NotificationActions } from "src/modules/notification_events/entity/notificationActions.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotificationActionTemplates } from "src/modules/notification_events/entity/notificationActionTemplates.entity";
import NotifmeSdk from 'notifme-sdk';
import { NotificationLog } from "../entity/notificationLogs.entity";
import { NotificationService } from "../notification.service";
import { LoggerUtil } from "src/common/logger/LoggerUtil";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "src/common/utils/constant.util";


@Injectable()
export class EmailAdapter implements NotificationServiceInterface {
    constructor(
        @Inject(forwardRef(() => NotificationService)) private readonly notificationServices: NotificationService
    ) { }

    async sendNotification(notificationDataArray) {
        const results = [];
        for (const notificationData of notificationDataArray) {
            try {
                const recipient = notificationData.recipient;
                if (!recipient || !this.isValidEmail(recipient)) {
                    throw new BadRequestException(ERROR_MESSAGES.INVALID_EMAIL);
                }
                const result = await this.send(notificationData);
                if (result.status === 'success') {
                    results.push({
                        recipient: recipient,
                        status: 200,
                        result: SUCCESS_MESSAGES.EMAIL_NOTIFICATION_SEND_SUCCESSFULLY
                    });
                } else {
                    results.push({
                        recipient: recipient,
                        status: 'error',
                        error: `Email not sent: ${JSON.stringify(result.errors)}`
                    });
                }
            }
            catch (error) {
                LoggerUtil.error(ERROR_MESSAGES.EMAIL_NOTIFICATION_FAILED, error);
                results.push({
                    recipient: notificationData.recipient,
                    status: 'error',
                    error: error.toString()
                });
            }
        }
        return results;
    }

    private createNotificationLog(notificationDto: NotificationDto, subject, key, bodyText: string, recipient: string): NotificationLog {
        const notificationLogs = new NotificationLog();
        notificationLogs.context = notificationDto.context;
        notificationLogs.subject = subject;
        notificationLogs.body = bodyText;
        notificationLogs.action = key
        notificationLogs.type = 'email';
        notificationLogs.recipient = recipient;
        return notificationLogs;
    }

    private getEmailConfig(context: string) {
        return {
            useNotificationCatcher: false,
            channels: {
                email: {
                    providers: [
                        {
                            type: process.env.EMAIL_TYPE,
                            host: process.env.EMAIL_HOST,
                            port: process.env.EMAIL_PORT,
                            secure: false,
                            auth: {
                                user: process.env.EMAIL_USER,
                                pass: process.env.EMAIL_PASS,
                            },
                        },
                    ],
                },
            },
            email: {
                from: process.env.EMAIL_FROM,
            },
        };
    }

    private isValidEmail(email: string) {
        const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
        return emailRegexp.test(email);
    }


    async send(notificationData) {
        const notificationLogs = this.createNotificationLog(notificationData, notificationData.subject, notificationData.key, notificationData.body, notificationData.recipient);
        try {
            const emailConfig = this.getEmailConfig(notificationData.context);
            const notifmeSdk = new NotifmeSdk(emailConfig);
            const result = await notifmeSdk.send({
                email: {
                    from: emailConfig.email.from,
                    to: notificationData.recipient,
                    subject: notificationData.subject,
                    html: notificationData.body,
                },
            });
            if (result.status === 'success') {
                notificationLogs.status = true;
                await this.notificationServices.saveNotificationLogs(notificationLogs);
                LoggerUtil.log(SUCCESS_MESSAGES.EMAIL_NOTIFICATION_SEND_SUCCESSFULLY);
                return result;
            }
            else {
                throw new Error(`Email not send ${JSON.stringify(result.errors)}`)
            }
        }
        catch (e) {
            LoggerUtil.error(ERROR_MESSAGES.EMAIL_NOTIFICATION_FAILED, e);
            notificationLogs.status = false;
            notificationLogs.error = e.toString();
            await this.notificationServices.saveNotificationLogs(notificationLogs);
            return e;
        }
    }
}