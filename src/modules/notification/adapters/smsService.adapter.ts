import { Injectable } from "@nestjs/common";
import { NotificationService } from "../interface/notificationService";
import { NotificationDto } from "../dto/notificationDto.dto";

@Injectable()
export class SmsAdapter implements NotificationService {
    async sendNotification(notificationDto: NotificationDto) {
        return `sms sent to  successfully`;
    }
}