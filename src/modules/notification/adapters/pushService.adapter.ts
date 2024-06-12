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
    async sendNotification(notificationDto: NotificationDto) {
        const { context, replacements } = notificationDto;
        const notification_event = await this.notificationEventsRepo.findOne({ where: { context } })
        if (!notification_event) {
            this.logger.error('/Send Push Notification', 'Template not found', context)
            throw new BadRequestException('Template not found')
        }

        // Fetching template configuration details from template id
        const notification_details = await this.notificationTemplateConfigRepository.find({ where: { actionId: notification_event.actionId, type: 'push' } });
        if (notification_details.length === 0) {
            this.logger.error('/Send Email Notification', `Template Config not found for this context : ${context}`, 'Not Found')
            throw new BadRequestException('Notification template config not defined');
        }

        let bodyText = notification_details[0].body;
        // Used for replacement tags
        if (replacements && replacements.length > 0) {
            replacements.forEach((replacement, index) => {
                bodyText = bodyText.replace(`{#var${index}#}`, replacement);
            });
        }


        const fcmUrl = this.fcmurl;
        const fcmKey = this.fcmkey;

        const notificationData = {
            notification: {
                title: notification_details[0].subject,
                body: bodyText,
                // image: notification_details[0].image,
                // navigate_to: notification_details[0].navigate_to,
            },
            to: notificationDto.push.to
        };
        const notificationLogs = this.createNotificationLog(notificationDto, notification_details, notification_event, bodyText);
        try {
            const result = await axios.post(fcmUrl, notificationData, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `key=${fcmKey}`,
                },
            });
            if (result.data.success === 1) {
                this.logger.log('Push notification sent successful')
                notificationLogs.status = true;
                await this.notificationServices.saveNotificationLogs(notificationLogs);
                return 'Push notification sent successful';
            }
            if (result.data.failure === 1) {
                throw new Error('Invalid token');
            }
        } catch (error) {
            this.logger.error(
                `Failed to Send Push Notification for ${context}`,
                error,
                '/Not able to send Notification',
            );
            notificationLogs.status = false;
            notificationLogs.error = error.toString();
            await this.notificationServices.saveNotificationLogs(notificationLogs);
            throw new Error('Failed to send push notification' + error)
        }
    }

    private createNotificationLog(notificationDto, notification_details, notification_event, bodyText): NotificationLog {
        const notificationLogs = new NotificationLog();
        notificationLogs.context = notificationDto.context;
        notificationLogs.subject = notification_details[0].subject;
        notificationLogs.body = bodyText
        notificationLogs.action = notification_event.key
        notificationLogs.type = 'push';
        notificationLogs.recipient = notificationDto.push.to;
        return notificationLogs;
    }

    async sendPushNotification(notificationData): Promise<string> {
        try {
            console.log(notificationData, "notitifcatioData");

            const notification = {
                notification: {
                    title: notificationData.subject,
                    body: notificationData.body,
                    // image: notification_details[0].image,
                    // navigate_to: notification_details[0].navigate_to,
                },
                to: notificationData.recipient
            };
            console.log(notification, "data");

            const result = await axios.post(this.fcmurl, notification, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `key=${this.fcmkey}`,
                },
            });
            // console.log(result, "result");
            if (result.data.success === 1) {
                return 'Push notification sent successfully';
            }

            if (result.data.failure === 1) {
                throw new Error('Invalid token');
            }

            throw new Error('Unknown response from FCM server');
        } catch (error) {
            throw new Error('Failed to send push notification: ' + error.toString());
        }
    }
}
