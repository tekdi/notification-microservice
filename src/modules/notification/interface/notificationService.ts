import { NotificationDto } from "../dto/notificationDto.dto";

export interface NotificationServiceInterface {
    sendNotification(notificationDto: NotificationDto);
}