import { BadRequestException, Injectable } from "@nestjs/common";
import { NotificationService } from "../interface/notificationService";
import { NotificationDto } from "../dto/notificationDto.dto";
import axios from "axios";
import { ConfigService } from "@nestjs/config";


@Injectable()
export class PushAdapter implements NotificationService {
    private fcmkey: string;
    private fcmurl: string
    constructor(
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

        try {
            const result = await axios.post(fcmUrl, notificationData, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `key=${fcmKey}`,
                },
            });
            if (result.data.success === 1) {
                return 'Push notification sent successfully';
            }
            if (result.data.failure === 1) {
                throw new BadRequestException('Invalid token');
            }
        } catch (error) {
            throw new BadRequestException('Failed to send push notification' + error)
        }
    }
}
