import { Injectable } from "@nestjs/common";
import { NotificationService } from "../interface/notificationService";
import { NotificationDto } from "../dto/notificationDto.dto";

@Injectable()
export class PushAdapter implements NotificationService {
    async sendNotification(notificationDto: NotificationDto) {
        return `Push sent to successfully`;
    }
}