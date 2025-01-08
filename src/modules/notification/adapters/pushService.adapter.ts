import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { NotificationServiceInterface } from "../interface/notificationService";
import axios from "axios";
import * as admin from "firebase-admin";
import { ConfigService } from "@nestjs/config";
import { NotificationLog } from "../entity/notificationLogs.entity";
import { NotificationService } from "../notification.service";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "../../../common/utils/constant.util";
import { LoggerUtil } from "../../../common/logger/LoggerUtil";
@Injectable()
export class PushAdapter implements NotificationServiceInterface {
    private readonly fcmurl: string;
    constructor(
        @Inject(forwardRef(() => NotificationService)) private readonly notificationServices: NotificationService,
        private readonly configService: ConfigService
    ) {
        this.fcmurl = this.configService.get('FCM_URL');

        // Initialize Firebase Admin SDK with environment variables
        const serviceAccount = {
            projectId: this.configService.get('FIREBASE_PROJECT_ID'),
            clientEmail: this.configService.get('FIREBASE_CLIENT_EMAIL'),
            privateKey: this.configService.get('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'), // Replace escaped newlines
        };

        if (admin.apps.length === 0) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
        }
    }
    async sendNotification(notificationDataArray) {
        const results = [];
        for (const notificationData of notificationDataArray) {
            try {
                const result = await this.send(notificationData);
                if (result.status === 200 && result.data.name) {
                    results.push({
                        recipient: notificationData.recipient,
                        status: 200,
                        result: SUCCESS_MESSAGES.PUSH_NOTIFICATION_SEND_SUCCESSFULLY
                    });
                }
            }
            catch (error) {
                LoggerUtil.error(ERROR_MESSAGES.PUSH_NOTIFICATION_FAILED, error.toString());
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
                message: {
                    notification: {
                        title: notificationData.subject,
                        body: notificationData.body,
                        image: notificationData.image || undefined
                    },
                    token: notificationData.recipient,
                    data: {
                        link: notificationData.link || ''
                    }
                }
            }

            // Retrieve OAuth 2.0 access token
            const accessToken = await this.getAccessToken();  // Function to get token

            const result = await axios.post(this.fcmurl, notification, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            if (result.status === 200 && result.data.name) {
                LoggerUtil.log(SUCCESS_MESSAGES.PUSH_NOTIFICATION_SEND_SUCCESSFULLY);
                notificationLogs.status = true;
                await this.notificationServices.saveNotificationLogs(notificationLogs);
                return result;
            } else {
                LoggerUtil.error(ERROR_MESSAGES.PUSH_NOTIFICATION_FAILED);
                throw new Error(ERROR_MESSAGES.PUSH_NOTIFICATION_FAILED);
            }
        } catch (error) {
            notificationLogs.status = false;
            notificationLogs.error = error.toString();
            await this.notificationServices.saveNotificationLogs(notificationLogs);
            throw error;
        }
    }

    async getAccessToken() {
        const token = await admin.credential.cert({
            projectId: this.configService.get('FIREBASE_PROJECT_ID'),
            clientEmail: this.configService.get('FIREBASE_CLIENT_EMAIL'),
            privateKey: this.configService.get('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
        }).getAccessToken();
        return token.access_token;
    }
}
