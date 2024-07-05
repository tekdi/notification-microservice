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
import { LoggerService } from "src/common/logger/logger.service";


@Injectable()
export class EmailAdapter implements NotificationServiceInterface {
    constructor(
        @Inject(forwardRef(() => NotificationService)) private readonly notificationServices: NotificationService,
        private logger: LoggerService
    ) { }

    async sendNotification(notificationDataArray) {
        const results = [];
        for (const notificationData of notificationDataArray) {
            try {
                const recipient = notificationData.recipient;
                if (!recipient || !this.isValidEmail(recipient)) {
                    throw new BadRequestException('Invalid Email ID or Request Format');
                }
                const result = await this.send(notificationData);
                if (result.status === 'success') {
                    results.push({
                        recipient: recipient,
                        status: 'success',
                        result: 'Email notification sent successfully'
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
                this.logger.error('Failed to send email notification', error);
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
                this.logger.log('Email notification sent successfully')
                return result;
            }

            else {
                throw new Error(`Email not send ${JSON.stringify(result.errors)}`)
            }
        }
        catch (e) {
            this.logger.error(
                `Failed to Send Email Notification for`, //${context}`,
                e,
                '/Not able to send Notification',
            );
            notificationLogs.status = false;
            notificationLogs.error = e.toString();
            await this.notificationServices.saveNotificationLogs(notificationLogs);
            return e;
        }
    }
}