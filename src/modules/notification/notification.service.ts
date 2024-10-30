import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { NotificationDto } from './dto/notificationDto.dto';
import { NotificationAdapterFactory } from './notificationadapters';
import APIResponse from 'src/common/utils/response';
// import * as FCM from 'fcm-node';
// import { SubscribeToDeviceTopicDto } from './dto/subscribtotopic.dto';
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
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from 'src/common/utils/constant.util';

@Injectable()
export class NotificationService {

  // private readonly fcm: FCM;
  private readonly fcmkey;
  private readonly fcmurl;

  constructor(
    @InjectRepository(NotificationLog)
    private readonly notificationLogRepository: Repository<NotificationLog>,
    @InjectRepository(NotificationActions)
    private readonly notificationActions: Repository<NotificationActions>,
    @InjectRepository(NotificationActionTemplates)
    private readonly notificationActionTemplates: Repository<NotificationActionTemplates>,
    @InjectRepository(NotificationQueue)
    private readonly notificationQueue: Repository<NotificationQueue>,
    private readonly notificationQueueService: NotificationQueueService,
    private readonly adapterFactory: NotificationAdapterFactory,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly amqpConnection: AmqpConnection,
  ) {
    this.fcmkey = this.configService.get('FCM_KEY');
    this.fcmurl = this.configService.get('FCM_URL')
    // this.fcm = new FCM(this.fcmkey);
  }

  async sendNotification(notificationDto: NotificationDto, response: Response): Promise<APIResponse> {
    const apiId = APIID.SEND_NOTIFICATION;
    try {
      const { email, push, sms, context, replacements, key } = notificationDto;
      const promises = [];
      const notification_event = await this.notificationActions.findOne({ where: { context, key } });

      if (!notification_event) {
        this.logger.error(SUCCESS_MESSAGES.SEND_NOTIFICATION, ERROR_MESSAGES.TEMPLATE_NOTFOUND, context);
        throw new BadRequestException(ERROR_MESSAGES.TEMPLATE_NOTFOUND);
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
      // const serverResponses = results.map((result) => {
      //   if (result.status === 'fulfilled') {
      //     return {
      //       data: result.value
      //     };
      //   } else {
      //     return {
      //       error: result.reason?.message,
      //       code: result.reason?.status
      //     };
      //   }
      // });
      const serverResponses = {
        email: { data: [], errors: [] },
        sms: { data: [], errors: [] },
        push: { data: [], errors: [] }
      };

      results.forEach((result, index) => {
        const channel = ['email', 'sms', 'push'][index];
        if (result.status === 'fulfilled') {
          const notifications = Array.isArray(result.value) ? result.value : [result.value];
          notifications.forEach(notification => {
            // result.value.forEach(notification => {
            if (notification.status === 200) {
              serverResponses[channel].data.push(notification);
            } else {
              serverResponses[channel].errors.push({
                recipient: notification.recipient,
                error: notification.error || notification.result,
                code: notification.status
              });
            }
          });
        } else {
          serverResponses[channel].errors.push({
            error: result.reason?.message,
            code: result.reason?.status
          });
        }
      });
      // Filter out channels with empty data and errors arrays
      // const finalResponses = Object.fromEntries(
      //   Object.entries(serverResponses).filter(([channel, { data, errors }]) => data.length > 0 || errors.length > 0 || errors.length > 0)
      // );
      // Filter out channels with empty data and errors arrays
      const finalResponses = Object.fromEntries(
        Object.entries(serverResponses).filter(([_, { data, errors }]) => data.length > 0 || errors.length > 0)
      );


      return APIResponse.success(
        response,
        apiId,
        finalResponses,
        HttpStatus.OK,
        SUCCESS_MESSAGES.NOTIFICATION_COMPLETED
      );

    }
    catch (e) {
      this.logger.error(
        ERROR_MESSAGES.NOTIFICATION_FAILED,
        e,
        SUCCESS_MESSAGES.SEND_NOTIFICATION,
      );
      throw e;
    }
  }

  // Helper function to handle sending notifications for a specific channel
  async notificationHandler(channel, recipients, type, replacements, notificationDto, notification_event) {
    if (recipients && recipients.length > 0 && Object.keys(recipients).length > 0) {
      const notification_details = await this.notificationActionTemplates.find({ where: { actionId: notification_event.actionId, type } });
      if (notification_details.length === 0) {
        this.logger.error(`/Send ${channel} Notification`, `${ERROR_MESSAGES.TEMPLATE_CONFIG_NOTFOUND} ${notificationDto.context}`, 'Not Found');
        throw new BadRequestException(`${ERROR_MESSAGES.TEMPLATE_CONFIG_NOTFOUND} ${type}`);
      }
      let bodyText;
      let subject;
      let image;
      let link;
      bodyText = notification_details[0].body;
      subject = notification_details[0].subject;
      image = notification_details[0]?.image;
      link = notification_details[0]?.link


      // Ensure replacements are in the correct format
      if (typeof replacements !== 'object' || replacements === null) {
        replacements = {};
      }

      // Extract placeholders from the templates
      const subjectPlaceholders = this.extractPlaceholders(subject);
      const bodyPlaceholders = this.extractPlaceholders(bodyText);

      // Validate that all placeholders are present in the replacements object
      this.validatePlaceholders([...subjectPlaceholders, ...bodyPlaceholders], replacements);


      // Replace placeholders in subject and bodyText
      subject = this.replacePlaceholders(subject, replacements);
      bodyText = this.replacePlaceholders(bodyText, replacements);

      const notificationDataArray = recipients.map(recipient => {
        return {
          subject: subject,
          body: bodyText,
          recipient: recipient,
          key: notification_event.key,
          context: notificationDto.context,
          channel: type,
          context_id: notification_event.actionId,
          image: image || null,
          link: link || null
        };
      });

      if (notificationDto.isQueue) {
        try {
          const saveQueue = await this.saveNotificationQueue(notificationDataArray);
          if (saveQueue.length === 0) {
            throw new Error(ERROR_MESSAGES.NOTIFICATION_QUEUE_SAVE_FAILED);
          }
          return { status: 200, message: SUCCESS_MESSAGES.NOTIFICATION_QUEUE_SAVE_SUCCESSFULLY };
        } catch (error) {
          this.logger.error(ERROR_MESSAGES.NOTIFICATION_QUEUE_SAVE_FAILED, error);
          throw new Error(ERROR_MESSAGES.NOTIFICATION_QUEUE_SAVE_FAILED);
        }
      } else {
        const adapter = this.adapterFactory.getAdapter(type);
        return adapter.sendNotification(notificationDataArray);
      }
    }
  };

  replacePlaceholders(template, replacements) {
    return template.replace(/{(\w+)}/g, (match, key) => {
      return replacements[match] || match; // Replace with the value or keep the placeholder
    });
  }

  // Function to extract placeholders from the template
  extractPlaceholders(template: string): string[] {
    const regex = /{(\w+)}/g;
    const matches = [];
    let match;
    while ((match = regex.exec(template)) !== null) {
      matches.push(match[0]);
    }
    return matches;
  }

  // Function to validate that all placeholders have corresponding replacements
  validatePlaceholders(placeholders: string[], replacements: { [key: string]: string }): void {
    const missingReplacements = placeholders.filter((placeholder) => !replacements.hasOwnProperty(placeholder));

    if (missingReplacements.length > 0) {
      throw new BadRequestException(`Missing replacements for placeholders: ${missingReplacements.join(', ')}`);
    }
  }



  //Provider which store in Queue 
  async saveNotificationQueue(notificationDataArray) {
    const arrayofResult = await this.notificationQueue.save(notificationDataArray);
    if (arrayofResult) {
      if (this.amqpConnection) {
        try {
          for (const result of arrayofResult) {
            this.amqpConnection.publish('notification.exchange', 'notification.route', result, { persistent: true });
          }
        }
        catch (e) {
          this.logger.error('/error to save in notification in rabbitMq', e)
          throw e;
        }
      }
      return arrayofResult;
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
      await adapter.sendNotification([notification])
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

  // async subscribeToDeviceTopicFromDB(requestBody: SubscribeToDeviceTopicDto) {
  //   try {
  //     const { deviceId, topicName } = requestBody;
  //     await this.fcm.subscribeToTopic(deviceId, topicName, (err, response) => {
  //       if (err) {
  //         console.error('Error subscribing to topic:', err);
  //         throw err;
  //       }
  //     });
  //   } catch (error) {
  //     this.logger.error(
  //       `Failed to Subscribe to topic ${requestBody.topicName}`,
  //       error,
  //       '/Not able to subscribe to topic',
  //     );
  //     throw error;
  //   }

  // }

  // async unsubscribeFromTopic(requestBody: SubscribeToDeviceTopicDto) {
  //   try {
  //     const { deviceId, topicName } = requestBody;
  //     if (deviceId.length > 0) {
  //       await this.fcm.unsubscribeToTopic(deviceId, topicName, (err, response) => {
  //         if (err) {
  //           throw err; // Handle the error as needed
  //         }
  //       });
  //     }
  //   } catch (error) {
  //     this.logger.error(
  //       `Failed to UnSubscribe to topic ${requestBody.topicName}`,
  //       error,
  //       '/Not able to Unsubscribe to topic',
  //     );
  //     throw error;
  //   }
  // }

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
        message: SUCCESS_MESSAGES.NOTIFICATION_SENT_SUCCESSFULLY,
        status: response.status
      }
    }
    catch (e) {
      this.logger.error(
        `Failed to Send Notification for this:  ${requestBody.topic_name} topic`,
        e.toString(),
        ERROR_MESSAGES.TOPIC_NOTIFICATION_FAILED,
      );
      return {
        message: ERROR_MESSAGES.TOPIC_NOTIFICATION_FAILED,
        status: e.response.status
      }
    }
  }

  async saveNotificationLogs(notificationLogs: NotificationLog) {
    try {
      await this.notificationLogRepository.save(notificationLogs);
    }
    catch (e) {
      this.logger.error(
        `/POST,
        ${e},
        ${ERROR_MESSAGES.NOTIFICATION_LOG_SAVE_FAILED},
      `);
      throw new Error(ERROR_MESSAGES.NOTIFICATION_LOG_SAVE_FAILED);
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
  //       to: `whatsapp: ${ notificationData.to }`,
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
