import { BadRequestException, Inject, Injectable, forwardRef } from "@nestjs/common";
import { NotificationServiceInterface } from "../interface/notificationService";
import { NotificationDto } from "../dto/notificationDto.dto";
import axios from "axios";
import { ConfigService } from "@nestjs/config";
import { NotificationLog } from "../entity/notificationLogs.entity";
import { NotificationService } from "../notification.service";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotificationActions } from "src/modules/notification_events/entity/notificationActions.entity";
import { NotificationActionTemplates } from "src/modules/notification_events/entity/notificationActionTemplates.entity";
import { LoggerService } from "src/common/logger/logger.service";
@Injectable()
export class PushAdapter implements NotificationServiceInterface {
    private fcmkey: string;
    private fcmurl: string
    constructor(
        @Inject(forwardRef(() => NotificationService)) private readonly notificationServices: NotificationService,
        private readonly configService: ConfigService,
        @InjectRepository(NotificationActions)
        private notificationEventsRepo: Repository<NotificationActions>,
        @InjectRepository(NotificationActionTemplates)
        private notificationTemplateConfigRepository: Repository<NotificationActionTemplates>,
        private logger: LoggerService
    ) {
        this.fcmkey = this.configService.get('FCM_KEY');
        this.fcmurl = this.configService.get('FCM_URL')
    }
    async sendNotification(notificationDataArray) {
        const results = [];
        for (const notificationData of notificationDataArray) {
            try {
                const result = await this.send(notificationData);
                // return result;
                if (result.data.success === 1) {
                    results.push({
                        recipient: notificationData.recipient,
                        status: 'success',
                        result: 'Push notification sent successfully'
                    });
                } else if (result.data.failure === 1) {
                    throw new Error('Invalid token');
                }

            }
            catch (error) {
                this.logger.error('Failed to send push notification', error);
                results.push({
                    recipient: notificationData.recipient,
                    status: 'error',
                    error: error.toString()
                });
            }
        }
        return results;
    }

    private createNotificationLog(context, subject, key, body, receipients): NotificationLog {
        const notificationLogs = new NotificationLog();
        notificationLogs.context = context;
        notificationLogs.subject = subject;
        notificationLogs.body = body
        notificationLogs.action = key
        notificationLogs.type = 'push';
        notificationLogs.recipient = receipients;
        return notificationLogs;
    }

    async send(notificationData) {
        const notificationLogs = this.createNotificationLog(notificationData.context, notificationData.subject, notificationData.key, notificationData.body, notificationData.recipient);
        try {
            const notification = {
                notification: {
                    title: notificationData.subject,
                    body: notificationData.body,
                },
                to: notificationData.recipient
            };
            const result = await axios.post(this.fcmurl, notification, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `key=${this.fcmkey}`,
                },
            });
            if (result.data.success === 1) {
                this.logger.log('Push notification sent successful')
                notificationLogs.status = true;
                await this.notificationServices.saveNotificationLogs(notificationLogs);
                return result;
            }
            if (result.data.failure === 1) {
                throw new Error('Invalid token');
            }
            throw new Error('Unknown response from FCM server');
        } catch (error) {
            this.logger.error(
                `Failed to Send Push Notification for ${notificationData.context}`,
                error,
                '/Not able to send Notification',
            );
            notificationLogs.status = false;
            notificationLogs.error = error.toString();
            await this.notificationServices.saveNotificationLogs(notificationLogs);
            throw error;
        }
    }
}
