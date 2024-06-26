import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { NotificationDto } from './dto/notificationDto.dto';
import { NotificationAdapterFactory } from './notificationadapters';
import APIResponse from 'src/common/utils/response';
import * as FCM from 'fcm-node';
import { SubscribeToDeviceTopicDto } from './dto/subscribtotopic.dto';
import { ConfigService } from '@nestjs/config';
import { TopicNotification } from './dto/topicnotification .dto';
import { NotificationLog } from './entity/notificationLogs.entity';
import { LoggerService } from 'src/common/logger/logger.service';
@Injectable()
export class NotificationService {
  @InjectRepository(NotificationLog)
  private notificationLogRepository: Repository<NotificationLog>
  private readonly fcm: FCM;
  private readonly fcmkey;
  private readonly fcmurl;

  constructor(
    private readonly adapterFactory: NotificationAdapterFactory,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService
  ) {
    this.fcmkey = this.configService.get('FCM_KEY');
    this.fcmurl = this.configService.get('FCM_URL')
    this.fcm = new FCM(this.fcmkey);
  }

  async sendNotification(notificationDto: NotificationDto): Promise<APIResponse> {
    const apiId = 'api.send.notification'
    try {
      const { email, push, sms } = notificationDto;
      const promises = [];
      // Send email notification if email channel is specified
      if (email && email.receipients.length > 0 && Object.keys(email).length > 0) {
        const emailAdapter = this.adapterFactory.getAdapter('email');
        promises.push(emailAdapter.sendNotification(notificationDto));
      }

      // Send SMS notification if SMS channel is specified
      if (sms && sms.receipients.length > 0 && Object.keys(sms).length > 0) {
        const smsAdapter = this.adapterFactory.getAdapter('sms');
        promises.push(smsAdapter.sendNotification(notificationDto));
      }

      // Send push notification if push channel is specified
      if (push && Object.keys(push).length > 0) {
        const pushAdapter = this.adapterFactory.getAdapter('push');
        promises.push(pushAdapter.sendNotification(notificationDto));
      }

      const results = await Promise.allSettled(promises);
      const serverResponses: APIResponse[] = results.map((result) => {
        if (result.status === 'fulfilled') {
          return APIResponse.success(
            apiId,
            result.value,
            'Notification send sucessfully'
          );
        } else {
          return APIResponse.error(
            apiId,
            'Something went wrong',
            result.reason?.message,
            result.reason.status
          );
        }
      });
      return serverResponses;
    } catch (e) {
      this.logger.error(
        `Failed to Send Notification`,
        e,
        '/Not able to send Notification',
      );
      return [
        APIResponse.error(
          apiId,
          'Something went wrong',
          e,
          'INTERNAL_SERVER_ERROR'
        ),
      ];
    }
  }

  async subscribeToDeviceTopicFromDB(requestBody: SubscribeToDeviceTopicDto) {
    try {
      const { deviceId, topicName } = requestBody;
      await this.fcm.subscribeToTopic(deviceId, topicName, (err, response) => {
        if (err) {
          console.error('Error subscribing to topic:', err);
          throw err;
        }
      });
    } catch (error) {
      this.logger.error(
        `Failed to Subscribe to topic ${requestBody.topicName}`,
        error,
        '/Not able to subscribe to topic',
      );
      throw error;
    }

  }

  async unsubscribeFromTopic(requestBody: SubscribeToDeviceTopicDto) {
    try {
      const { deviceId, topicName } = requestBody;
      if (deviceId.length > 0) {
        await this.fcm.unsubscribeToTopic(deviceId, topicName, (err, response) => {
          if (err) {
            throw err; // Handle the error as needed
          }
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to UnSubscribe to topic ${requestBody.topicName}`,
        error,
        '/Not able to Unsubscribe to topic',
      );
      throw error;
    }
  }

  async sendTopicNotification(requestBody: TopicNotification) {
    try {
      const topic_name = requestBody;
      const fcmUrl = this.fcmurl;
      const fcmKey = this.fcmkey;

      const notificationData = {
        notification: {
          title: requestBody.title,
          body: requestBody.body,
          image: requestBody.image,
          navigate_to: requestBody.navigate_to,
        },
        to: `/topics/${topic_name}`,
      };
      const response = await axios.post(fcmUrl, notificationData, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${fcmKey}`,
        },
      });
      return `topic notification sent successfully'${response.status}`;
    }
    catch (e) {
      this.logger.error(
        `Failed to Send  Notification for topic this:  ${requestBody.topic_name}`,
        e,
        '/Not able to send topic Notification',
      );
      return 'Failed to send topic notification';
    }
  }

  async saveNotificationLogs(notificationLogs: NotificationLog) {
    try {
      const result = await this.notificationLogRepository.save(notificationLogs);
    }
    catch (e) {
      this.logger.error(
        `/POST Save notification log for notification`,
        e,
        '/Failed to  Save Log of Notification for notification',
      );
      throw new Error('Failed to save notification logs');
    }
  }

  // async findAll(): Promise<Notification[]> {
  //   return await this.notificationRepository.find();
  // }

  // async sendPush(notificationPush: NotificationPush): Promise<any> {
  //   if (notificationPush != null) {
  //     this.logger.info('Notification is not null...');
  //     const token = notificationPush.token;
  //     const sender_id = notificationPush.sender_id;
  //     const title = notificationPush.title;
  //     const body = notificationPush.body;

  //     // senderid :'AAAAfzfFOMg:APA91bExdish2-dqVvVfcZetfpCqjVpOYv7-26J-dW9m1dKvMOIXlNhsx9_Guuxni_D9ppFiNVnxYd9hYBvyY94jLOlPwhlmyAlU9A-mUi3N3Sp35wjY6uRMJB8VNRJ7x-kxCzsZKrr2'
  //     const notifmeSdk = new NotifmeSdk({
  //       useNotificationCatcher: false,
  //       channels: {
  //         push: {
  //           providers: [
  //             {
  //               type: 'fcm',
  //               id: sender_id,
  //             },
  //           ],
  //         },
  //       },
  //     });
  //     notifmeSdk
  //       .send({
  //         push: {
  //           registrationToken: token,
  //           title: title,
  //           body: body,
  //           icon: 'https://notifme.github.io/notifme-sdk/img/icon.png',
  //         },
  //       })
  //       .then(this.logger.info('Push Sent Successfully'));
  //   }
  // }
  // // proper working function
  // async sendWhatsappMessage(
  //   notificationData: NotificationWhatsapp,
  // ): Promise<any> {
  //   const accountSid = process.env.TWILIO_ACCOUNT_SID;
  //   const authToken = process.env.TWILIO_AUTH_TOKEN;

  //   const twilio = require('twilio');
  //   const client = twilio(accountSid, authToken);

  //   try {
  //     const message = await client.messages.create({
  //       body: notificationData.message,
  //       from: 'whatsapp:+14155238886',
  //       to: `whatsapp:${notificationData.to}`,
  //     });
  //     this.logger.info('Message sent successfully to whatsapp');

  //     // console.log('Message sent successfully');
  //     return message;
  //   } catch (error) {
  //     console.error('Error sending message:', error.message);
  //     this.logger.error('Message not sent');

  //     throw new Error(error.message);
  //   }
  // }

  // async sendTelegramMessage(notificationData: NotificationTelegram) {
  //   const botToken = process.env.Bot_Token;
  //   const TELEGRAM_API_BASE_URL = `https://api.telegram.org/bot${botToken}`;

  //   if (!notificationData.chatId) {
  //     throw new Error('chatId is required');
  //   }

  //   const url = `${TELEGRAM_API_BASE_URL}/sendMessage`;
  //   const params = {
  //     chat_id: notificationData.chatId,
  //     text: notificationData.text,
  //   };
  //   console.log(params);

  //   try {
  //     console.log('Sending message with params:', params);

  //     const response = await axios.post(url, params);
  //     console.log('Response:', response.data);
  //     this.logger.info('message sent to telegram');
  //     return response.data;
  //   } catch (error) {
  //     console.error(
  //       `Error sending message: ${error.message}. Status Code: ${error.response?.status}`,
  //     );

  //     throw new Error(
  //       `Error sending message: ${error.message}. Status Code: ${error.response?.status}`,
  //     );
  //   }
  // }

  // logger = createLogger({
  //   transports: [
  //     new transports.File({
  //       dirname: 'logs',
  //       filename: 'combined.log',
  //     }),
  //     new transports.File({
  //       dirname: 'logs',
  //       filename: 'error.log',
  //       level: 'error',
  //     }),
  //     new transports.Console({
  //       level: 'info',
  //     }),
  //   ],
  //   format: format.combine(
  //     format.timestamp(),
  //     format.printf(({ timestamp, level, message, service }) => {
  //       return (
  //         `${timestamp} ${level.toUpperCase()} [${service},,]: ${message}` +
  //         ' notification.service.ts :: send'
  //       );
  //     }),
  //   ),
  //   defaultMeta: {
  //     service: 'SIP-Notification-Service',
  //   },
  // });
}
