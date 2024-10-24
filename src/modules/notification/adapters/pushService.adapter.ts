import { Inject, Injectable, forwardRef } from "@nestjs/common";
import { NotificationServiceInterface } from "../interface/notificationService";
import axios from "axios";
import * as admin from "firebase-admin";
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
    private readonly fcmurl: string;
    constructor(
        @Inject(forwardRef(() => NotificationService)) private readonly notificationServices: NotificationService,
        private readonly configService: ConfigService,
        private readonly logger: LoggerService
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
                        result: 'Push notification sent successfully'
                    });
                }
            }
            catch (error) {
                this.logger.error('Failed to send push notification', error.toString());
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
                    },
                    token: notificationData.recipient
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
                this.logger.log('Push notification sent successfully');
                notificationLogs.status = true;
                await this.notificationServices.saveNotificationLogs(notificationLogs);
                return result;
            } else {
                this.logger.log('Failed to send push notification: Invalid response from FCM');
                throw new Error('Failed to send push notification: Invalid response from FCM');
            }
        } catch (error) {
            notificationLogs.status = false;
            notificationLogs.error = error.toString();
            await this.notificationServices.saveNotificationLogs(notificationLogs);
            throw error;
        }
    }

    async getAccessToken() {
        try {
            const token = await admin.credential.cert({
                projectId: this.configService.get('FIREBASE_PROJECT_ID'),
                clientEmail: this.configService.get('FIREBASE_CLIENT_EMAIL'),
                privateKey: this.configService.get('FIREBASE_PRIVATE_KEY').replace(/\\n/g, '\n'),
            }).getAccessToken();
            return token.access_token;
        } catch (error) {
            throw error;
        }
    }
}
