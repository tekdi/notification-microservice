import { BadRequestException, Inject, Injectable, forwardRef } from "@nestjs/common";
import { NotificationServiceInterface } from "../interface/notificationService";
import { NotificationDto } from "../dto/notificationDto.dto";
import axios from "axios";
import { ConfigService } from "@nestjs/config";
import { NotificationLog } from "../entity/notificationLogs.entity";
import { NotificationService } from "../notification.service";

@Injectable()
export class PushAdapter implements NotificationServiceInterface {
    private fcmkey: string;
    private fcmurl: string
    constructor(
        @Inject(forwardRef(() => NotificationService)) private readonly notificationServices: NotificationService,
        private readonly configService: ConfigService
    ) {
        this.fcmkey = this.configService.get('FCM_KEY');
        this.fcmurl = this.configService.get('FCM_URL')
    }
    async sendNotification(notificationDto: NotificationDto) {
        const fcmUrl = this.fcmurl;
        const fcmKey = this.fcmkey;

        const notificationData = {
            notification: {
                title: notificationDto.push.title,
                body: notificationDto.push.body,
                image: notificationDto.push.image,
                navigate_to: notificationDto.push.navigate_to,
            },
            to: notificationDto.push.to
        };
        const notificationLogs = this.createNotificationLog(notificationDto);
        try {
            const result = await axios.post(fcmUrl, notificationData, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `key=${fcmKey}`,
                },
            });
            if (result.data.success === 1) {
                notificationLogs.status = true;
                await this.notificationServices.saveNotificationLogs(notificationLogs);
                return 'Push notification sent successfully';
            }
            if (result.data.failure === 1) {
                throw new BadRequestException('Invalid token');
            }
        } catch (error) {
            notificationLogs.status = false;
            notificationLogs.error = error.toString();
            await this.notificationServices.saveNotificationLogs(notificationLogs);
            throw new Error('Failed to send push notification' + error)
        }
    }

    private createNotificationLog(notificationDto): NotificationLog {
        const notificationLogs = new NotificationLog();
        notificationLogs.context = notificationDto.context;
        notificationLogs.subject = notificationDto.push.title;
        notificationLogs.body = notificationDto.push.body;
        notificationLogs.type = 'push';
        notificationLogs.recipient = notificationDto.push.to;
        return notificationLogs;
    }

}
