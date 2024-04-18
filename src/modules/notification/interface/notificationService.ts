import { NotificationDto } from "../dto/notificationDto.dto";

export interface NotificationService {
    sendNotification(notificationDto: NotificationDto);
}