import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entity/notification.entity';
import NotifmeSdk from 'notifme-sdk';
import { isInt16Array } from 'util/types';
import { NotificationEventsService } from '../notification_events/notification_events.service';
import { NotificationTemplateConfigService } from '../notification_template_config/notification_template_config.service';
import { Notification_Template_Config } from '../notification_template_config/entity/notification_template_config.entity';
import { NotificationEvents } from '../notification_events/entity/notification_events.entity';
import { NotificationPush } from './entity/notificationPush.entity';
import { Body, Controller, Post, Get } from '@nestjs/common';
import { createLogger, transports, format } from 'winston';
import { combineLatest } from 'rxjs';
import { NotificationWhatsapp } from './entity/notificationWhatsapp.entity';
import { NotificationTelegram } from './entity/notificationTelegram.entity';
import axios from 'axios';

@Injectable()
export class NotificationService {
  @InjectRepository(Notification)
  private notificationRepository: Repository<Notification>;

  constructor(
    private notificationeventsService: NotificationEventsService,
    private notificatiotempConfigService: NotificationTemplateConfigService,
  ) { }

  async send(notification: Notification): Promise<string> {
    try {
      // this.logger.info('Notification api called...')
      // this.logger.info('Checking if Notification is not null...');
      if (notification != null) {
        const channel = notification.channel;
        const language = notification.language;
        const action = notification.action;
        const receipients = notification.receipients;
        const replacements = notification.replacements;
        notification.createdOn = new Date();
        // this.logger.info(
        //   'fetching template id by action(request body) from template events tbl',
        // );
        console.log('notification', notification);
        const notification_event =
          this.notificationeventsService.getNotificationEventByAction(action);
        if (notification_event != null) {
          var notification_event_id = (await notification_event).id;
          this.logger.info(notification_event_id);
          // this.logger.info(
          //   'fetched template id by action(request body) from template events tbl',
          // );
          // this.logger.info(
          //   'fetching template configuration details from template id...',
          // );
          var notification_details =
            this.notificatiotempConfigService.getNotificationConfigByIDandLanguage(
              notification_event_id,
              language,
            );
          console.log('notification_details', notification_details);
          // this.logger.info(notification_details);
          if (notification_details != null) {
            // this.logger.info((await notification_details).id);
            // this.logger.info(
            //   'fetched template configuration details from template id...',
            // );
            // this.logger.info('replacing string with replacement parameter in body');
            var bodyText = (await notification_details).body;
            this.logger.info(bodyText);

            if (replacements != null && replacements.length > 0) {
              for (var i = 0; i < replacements.length; i++) {
                bodyText = bodyText.replace(
                  '{#var' + i + '#}',
                  replacements[i],
                );
              }
            }

            console.log('Msg Text:', bodyText);
            // this.logger.info(bodyTextWithReplacement);
            // this.logger.info('replaced string with replacement parameter in body');
            // this.logger.info(receipients.length);
            if (receipients != null && receipients.length > 0) {
              for (var i = 0; i < receipients.length; i++) {
                this.logger.info('Entered in loop for multiple receipients...');
                let singleRecipient = receipients[i];
                this.logger.info('reciepient' + i + ':' + receipients[i]);
                if (singleRecipient != null) {
                  switch (channel) {
                    case 'SMS':
                      const regexExpForMobileNumber = /^[6-9]\d{9}$/gi;
                      this.logger.info('Checking if mobile number is valid..');
                      if (regexExpForMobileNumber.test(singleRecipient)) {
                        this.logger.info('Mobile number is valid...');
                        this.logger.info('Calling Notifme SDK to send SMS...');
                        const notifmeSdk = new NotifmeSdk({
                          useNotificationCatcher: false,
                          channels: {
                            sms: {
                              providers: [
                                {
                                  type: 'custom',
                                  secure: true,
                                  id: process.env.SMS_PROVIDER_ID,
                                  send: async (request) => {
                                    const https = require('https');
                                    https
                                      .get(
                                        process.env.SMS_URL +
                                        '&to=' +
                                        singleRecipient +
                                        '&msg=' +
                                        bodyText,
                                        (resp) => {
                                          if (resp.statusCode == '200') {
                                            notification.sentStatus = 'Success';
                                            this.logger.info(
                                              'SMS sent successfully to ' +
                                              singleRecipient,
                                            );
                                            return 'OK';
                                          } else {
                                            var errorMsgSMS = '';
                                            console.log(resp);
                                            if (resp.statusMessage != undefined)
                                              errorMsgSMS = resp.statusMessage;
                                            notification.sentStatus = 'Failure';
                                            this.logger.error(
                                              'Error while sending SMS to ' +
                                              singleRecipient +
                                              ' Due to Reason // Status Code:' +
                                              resp.statusCode +
                                              ' and Details:' +
                                              errorMsgSMS,
                                            );
                                            return (
                                              'Error while sending SMS to ' +
                                              singleRecipient +
                                              ' Due to Reason // Status Code:' +
                                              resp.statusCode +
                                              ' and Details:' +
                                              errorMsgSMS
                                            );
                                          }
                                        },
                                      )
                                      .on('error', (err) => {
                                        notification.sentStatus = 'Failure';
                                        this.logger.error(
                                          'Error while sending SMS to ' +
                                          singleRecipient,
                                        );
                                      });
                                  },
                                },
                              ],
                            },
                          },
                        });
                        notifmeSdk
                          .send({
                            sms: {},
                          })
                          .then(
                            this.logger.info(
                              'SMS Sent Successfully to ' + singleRecipient,
                            ),
                          );
                      } else {
                        this.logger.error('Invalid Mobile Number...');
                        return 'Invalid Number';
                      }
                      break;
                    case 'EMAIL':
                      const emailRegexp =
                        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
                      this.logger.info('Checking if email Id is valid..');
                      if (emailRegexp.test(singleRecipient)) {
                        this.logger.info('Email Id is valid..');
                        this.logger.info(
                          'Calling Notifme SDK to send Email...',
                        );
                        var notifmeSdk;
                        if (action.startsWith('ITI')) {
                          notifmeSdk = await this.sendEmail(
                            notifmeSdk,
                            singleRecipient,
                            notification_details,
                            bodyText,
                            notification,
                            process.env.ITI_EMAIL_TYPE,
                            process.env.ITI_EMAIL_HOST,
                            process.env.ITI_EMAIL_PORT,
                            process.env.ITI_EMAIL_USER,
                            process.env.ITI_EMAIL_PASS,
                            process.env.ITI_EMAIL_FROM,
                          );
                        } else {
                          notifmeSdk = await this.sendEmail(
                            notifmeSdk,
                            singleRecipient,
                            notification_details,
                            bodyText,
                            notification,
                            process.env.EMAIL_TYPE,
                            process.env.EMAIL_HOST,
                            process.env.EMAIL_PORT,
                            process.env.EMAIL_USER,
                            process.env.EMAIL_PASS,
                            process.env.EMAIL_FROM,
                          );
                        }
                      } else {
                        this.logger.error('Invalid Email Id..');
                        return 'Invalid Email Id';
                      }
                      break;
                    default:
                      return 'Invalid Channel Name..';
                  }
                } else {
                  this.logger.error('Invalid Receipient in request...');
                  return 'Invalid Request Format';
                }
              }
            } else {
              this.logger.error('No receipient data found in request...');
              return 'Receipients cannot be empty..';
            }
          } else {
            this.logger.error(
              'Notification Details not found for given request...',
            );
            return 'Notification Details not found for given request...Invalid Request Format';
          }
        } else {
          this.logger.error(
            'Notification Details not found for given request..',
          );
          return 'Notification Details not found for given request...Invalid Request Format';
        }
      } else {
        this.logger.error(
          'Notification Details not found for given request...',
        );
        return 'Notification Details not found for given request...Invalid Request Format';
      }
    } catch (error) {
      console.log('in catch');
      this.logger.error('Notification Details not found for given request...');
      return 'Notification Details not found for given request...Invalid Request Format';
    }
  }

  private async sendEmail(
    notifmeSdk: any,
    singleRecipient: string,
    notification_details: Promise<Notification_Template_Config>,
    bodyText: string,
    notification: Notification,
    email_type: string,
    email_host: string,
    email_port: string,
    email_user: string,
    email_pass: string,
    email_from: string,
  ) {
    notifmeSdk = new NotifmeSdk({
      useNotificationCatcher: false,
      channels: {
        email: {
          providers: [
            {
              type: email_type,
              host: email_host,
              port: email_port,
              secure: false,
              auth: {
                user: email_user,
                pass: email_pass,
              },
            },
          ],
        },
      },
    });
    notifmeSdk
      .send({
        email: {
          from: email_from,
          to: singleRecipient,
          subject: (await notification_details).subject,
          html: bodyText,
        },
      })
      .then((result) => {
        if (result.status == 'success') {
          notification.sentStatus = 'Success';
          this.logger.info('Email Sent Successfully to ' + singleRecipient);
        } else {
          var errorMsg = 'Data Not Available';
          if (result.errors.email != undefined) errorMsg = result.errors.email;
          notification.sentStatus = 'Failure';
          this.logger.error(
            'Error while Sending Email to ' +
            singleRecipient +
            ' Due to Reason // Status:' +
            result.status +
            ' and Details:' +
            errorMsg,
          );
        }
      });
    return notifmeSdk;
  }

  async findAll(): Promise<Notification[]> {
    return await this.notificationRepository.find();
  }

  async sendPush(notificationPush: NotificationPush): Promise<any> {
    if (notificationPush != null) {
      this.logger.info('Notification is not null...');
      const token = notificationPush.token;
      const sender_id = notificationPush.sender_id;
      const title = notificationPush.title;
      const body = notificationPush.body;

      // senderid :'AAAAfzfFOMg:APA91bExdish2-dqVvVfcZetfpCqjVpOYv7-26J-dW9m1dKvMOIXlNhsx9_Guuxni_D9ppFiNVnxYd9hYBvyY94jLOlPwhlmyAlU9A-mUi3N3Sp35wjY6uRMJB8VNRJ7x-kxCzsZKrr2'
      const notifmeSdk = new NotifmeSdk({
        useNotificationCatcher: false,
        channels: {
          push: {
            providers: [
              {
                type: 'fcm',
                id: sender_id,
              },
            ],
          },
        },
      });
      notifmeSdk
        .send({
          push: {
            registrationToken: token,
            title: title,
            body: body,
            icon: 'https://notifme.github.io/notifme-sdk/img/icon.png',
          },
        })
        .then(this.logger.info('Push Sent Successfully'));
    }
  }
  // proper working function
  async sendWhatsappMessage(
    notificationData: NotificationWhatsapp,
  ): Promise<any> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    const twilio = require('twilio');
    const client = twilio(accountSid, authToken);

    try {
      const message = await client.messages.create({
        body: notificationData.message,
        from: 'whatsapp:+14155238886',
        to: `whatsapp:${notificationData.to}`,
      });
      this.logger.info('Message sent successfully to whatsapp');

      // console.log('Message sent successfully');
      return message;
    } catch (error) {
      console.error('Error sending message:', error.message);
      this.logger.error('Message not sent');

      throw new Error(error.message);
    }
  }

  async sendTelegramMessage(notificationData: NotificationTelegram) {
    const botToken = process.env.Bot_Token;
    const TELEGRAM_API_BASE_URL = `https://api.telegram.org/bot${botToken}`;

    if (!notificationData.chatId) {
      throw new Error('chatId is required');
    }

    const url = `${TELEGRAM_API_BASE_URL}/sendMessage`;
    const params = {
      chat_id: notificationData.chatId,
      text: notificationData.text,
    };
    console.log(params);

    try {
      console.log('Sending message with params:', params);

      const response = await axios.post(url, params);
      console.log('Response:', response.data);
      this.logger.info('message sent to telegram');
      return response.data;
    } catch (error) {
      console.error(
        `Error sending message: ${error.message}. Status Code: ${error.response?.status}`,
      );

      throw new Error(
        `Error sending message: ${error.message}. Status Code: ${error.response?.status}`,
      );
    }
  }

  logger = createLogger({
    transports: [
      new transports.File({
        dirname: 'logs',
        filename: 'combined.log',
      }),
      new transports.File({
        dirname: 'logs',
        filename: 'error.log',
        level: 'error',
      }),
      new transports.Console({
        level: 'info',
      }),
    ],
    format: format.combine(
      format.timestamp(),
      format.printf(({ timestamp, level, message, service }) => {
        return (
          `${timestamp} ${level.toUpperCase()} [${service},,]: ${message}` +
          ' notification.service.ts :: send'
        );
      }),
    ),
    defaultMeta: {
      service: 'SIP-Notification-Service',
    },
  });
}
