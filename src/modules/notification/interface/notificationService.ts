export interface NotificationServiceInterface {
    sendNotification(notificationDataArray, traceId?: string);
}