import { Injectable } from "@nestjs/common";
import { NotificationService } from "../interface/notificationService";
import { NotificationDto } from "../dto/notificationDto.dto";

@Injectable()
export class EmailAdapter implements NotificationService {
    async sendNotification(notificationDto: NotificationDto) {
        return `Email sent to  successfully`;
    }
}