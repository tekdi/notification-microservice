import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
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
import { Response } from 'express';
import { NotificationActions } from '../notification_events/entity/notificationActions.entity';
import { NotificationActionTemplates } from '../notification_events/entity/notificationActionTemplates.entity';
import { NotificationQueue } from '../notification-queue/entities/notificationQueue.entity';
import { AmqpConnection, RabbitSubscribe } from '@nestjs-plus/rabbitmq';
import { NotificationQueueService } from '../notification-queue/notificationQueue.service';
import { APIID } from 'src/common/utils/api-id.config';
@Injectable()
export class NotificationService {

  private readonly fcm: FCM;
  private readonly fcmkey;
  private readonly fcmurl;

  constructor(
    @InjectRepository(NotificationLog)
    private notificationLogRepository: Repository<NotificationLog>,
    @InjectRepository(NotificationActions)
    private notificationActions: Repository<NotificationActions>,
    @InjectRepository(NotificationActionTemplates)
    private notificationActionTemplates: Repository<NotificationActionTemplates>,
    @InjectRepository(NotificationQueue)
    private notificationQueue: Repository<NotificationQueue>,
    private readonly notificationQueueService: NotificationQueueService,
    private readonly adapterFactory: NotificationAdapterFactory,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly amqpConnection: AmqpConnection,
  ) {
    this.fcmkey = this.configService.get('FCM_KEY');
    this.fcmurl = this.configService.get('FCM_URL')
    this.fcm = new FCM(this.fcmkey);
  }

  async sendNotification(notificationDto: NotificationDto, response: Response): Promise<APIResponse> {
    const apiId = APIID.SEND_NOTIFICATION;
    try {
      const { email, push, sms, context, replacements, key } = notificationDto;
      const promises = [];
      const notification_event = await this.notificationActions.findOne({ where: { context, key } });

      if (!notification_event) {
        this.logger.error('/Send Notification', 'Template not found', context);
        throw new BadRequestException('Template not found');
      }

      // Handle email notifications if specified
      if (email && email.receipients && email.receipients.length > 0) {
        promises.push(this.notificationHandler('email', email.receipients, 'email', replacements, notificationDto, notification_event));
      }

      // Handle SMS notifications if specified
      if (sms && sms.receipients && sms.receipients.length > 0) {
        promises.push(this.notificationHandler('sms', sms.receipients, 'sms', replacements, notificationDto, notification_event));
      }

      // Handle push notifications if specified
      if (push && push.receipients && push.receipients.length > 0) {
        promises.push(this.notificationHandler('push', push.receipients, 'push', replacements, notificationDto, notification_event));
      }

      const results = await Promise.allSettled(promises);
      const serverResponses = results.map((result) => {
        if (result.status === 'fulfilled') {
          return {
            data: result.value
          };
        } else {
          return {
            error: result.reason?.message,
            code: result.reason?.status
          };
        }
      });

      return APIResponse.success(
        response,
        apiId,
        serverResponses,
        HttpStatus.OK,
        'Notification process completed'
      );

    } catch (e) {
      this.logger.error(
        `Failed to Send Notification`,
        e,
        '/Not able to send Notification',
      );
      const errorMessage = e.message || 'Internal server error';
      return APIResponse.error(
        response,
        apiId,
        'Something went wrong',
        errorMessage,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Helper function to handle sending notifications for a specific channel
  async notificationHandler(channel, recipients, type, replacements, notificationDto, notification_event) {
    if (recipients && recipients.length > 0 && Object.keys(recipients).length > 0) {
      const notification_details = await this.notificationActionTemplates.find({ where: { actionId: notification_event.actionId, type } });
      if (notification_details.length === 0) {
        this.logger.error(`/Send ${channel} Notification`, `Template Config not found for this context: ${notificationDto.context}`, 'Not Found');
        throw new BadRequestException(`Notification template config not defined for ${type}`);
      }

      let bodyText = notification_details[0].body;
      const placeholders = (bodyText.match(/\{#var\d+#\}/g) || []).length;
      if (!Array.isArray(replacements)) {
        replacements = []; // Assuming default behavior if replacements is not provided
      }
      if (placeholders !== replacements.length) {
        throw new BadRequestException(`Mismatch between placeholders and replacements: ${placeholders} placeholders and ${replacements.length} replacements.`);
      }

      if (replacements && replacements.length > 0) {
        replacements.forEach((replacement, index) => {
          bodyText = bodyText.replace(`{#var${index}#}`, replacement);
        });
      }

      const notificationDataArray = recipients.map(recipient => {
        return {
          subject: notification_details[0].subject,
          body: bodyText,
          recipient: recipient,
          key: notification_event.key,
          context: notificationDto.context,
          channel: type,
          context_id: notification_event.actionId
        };
      });

      if (notificationDto.isQueue) {
        try {
          const saveQueue = await this.saveNotificationQueue(notificationDataArray);
          if (saveQueue.length === 0) {
            throw new Error('Failed to save notifications in  queue');
          }
          return { success: true, message: 'Notification saved in queued successfully' };
        } catch (error) {
          this.logger.error('Error to save notifications in queue', error);
          throw new Error('Failed to save notifications in queue');
        }
      } else {
        const adapter = this.adapterFactory.getAdapter(type);
        return adapter.sendNotification(notificationDataArray);
      }
    }
  };


  //Provider which store in Queue 
  async saveNotificationQueue(notificationDataArray) {
    try {
      const arrayofResult = await this.notificationQueue.save(notificationDataArray);
      if (arrayofResult) {
        if (this.amqpConnection && arrayofResult) {
          try {
            for (const result of arrayofResult) {
              this.amqpConnection.publish('notification.exchange', 'notification.route', result, { persistent: true });
            }
          }
          catch (e) {
            throw e;
          }
        }
        return arrayofResult;
      }
    }
    catch (e) {
      throw e;
    }
  }

  @RabbitSubscribe({
    exchange: 'notification.exchange',
    routingKey: 'notification.route',
    queue: 'notification.queue',
  })
  async handleNotification(notification, message: any, retryCount = 3) {
    try {
      const adapter = this.adapterFactory.getAdapter(notification.channel);
      const result = await adapter.sendNotification([notification])
      const updateQueueDTO = { status: true, retries: 3 - retryCount, last_attempted: new Date() };
      await this.notificationQueueService.updateQueue(notification.id, updateQueueDTO)
    }
    catch (error) {
      if (retryCount > 0) {
        setTimeout(async () => {
          await this.handleNotification(notification, message, retryCount - 1);
        }, 2000);
      } else {
        const updateQueueDTO = { last_attempted: new Date(), retries: 3 };
        await this.notificationQueueService.updateQueue(notification.id, updateQueueDTO)
      }
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
      const topic_name = requestBody.topic_name;
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
      return {
        message: 'Notification sent successfully',
        status: response.status
      }
    }
    catch (e) {
      this.logger.error(
        `Failed to Send  Notification for topic this:  ${requestBody.topic_name}`,
        e,
        '/Not able to send topic Notification',
      );
      return {
        message: 'Failed to send topic notification',
        status: e.response.status
      }
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
