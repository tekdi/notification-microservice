import { BadRequestException, Injectable } from "@nestjs/common";
import { NotificationService } from "../interface/notificationService";
import { NotificationDto } from "../dto/notificationDto.dto";
import { NotificationTemplates } from "src/modules/notification_events/entity/notificationTemplate.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotificationTemplateConfig } from "src/modules/notification_events/entity/notificationTemplateConfig.entity";
import NotifmeSdk from 'notifme-sdk';
@Injectable()
export class SmsAdapter implements NotificationService {

    constructor(
        @InjectRepository(NotificationTemplates)
        private notificationEventsRepo: Repository<NotificationTemplates>,
        @InjectRepository(NotificationTemplateConfig)
        private notificationTemplateConfigRepository: Repository<NotificationTemplateConfig>
    ) {
    }
    async sendNotification(notificationDto: NotificationDto) {
        try {
            const { context, sms, replacements } = notificationDto;
            const { receipients } = sms;
            const notification_event = await this.notificationEventsRepo.findOne({ where: { context } })
            if (!notification_event) {
                throw new BadRequestException('Template not found')
            }

            // fetching template configuration details from template id...,
            const notification_details = await this.notificationTemplateConfigRepository.find({ where: { template_id: notification_event.id, type: 'sms' } });
            if (notification_details.length === 0) {
                throw new BadRequestException('Notification template config not define')
            }
            let bodyText = notification_details[0].body;
            //used for replscement tag 
            if (replacements != null && replacements.length > 0) {
                for (var i = 0; i < replacements.length; i++) {
                    bodyText = bodyText.replace(
                        '{#var' + i + '#}',
                        replacements[i],
                    );
                }
            }
            if (!receipients || receipients.length === 0) {
                throw new BadRequestException('Recipients cannot be empty');
            }

            for (const recipient of receipients) {
                if (!this.isValidMobileNumber(recipient)) {
                    throw new BadRequestException('Invalid Number');
                }

                await this.sendSMSWithNotifmeSdk(recipient, bodyText);
                return 'SMS notification sent successfully';
            }

        } catch (error) {
            throw new BadRequestException('Notification Details not found for given request...Invalid Request Format', error);
        }
        return "sms service";
    }



    private isValidMobileNumber(mobileNumber: string) {
        const regexExpForMobileNumber = /^[6-9]\d{9}$/gi;
        return regexExpForMobileNumber.test(mobileNumber);
    }


    private async sendSMSWithNotifmeSdk(recipient: string, bodyText: string) {
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
                                return new Promise((resolve, reject) => {
                                    https.get(`${process.env.SMS_URL}&to=${recipient}&msg=${bodyText}`, (resp) => {
                                        if (resp.statusCode === 200) {
                                            resolve('OK');
                                        } else {
                                            reject(`Error while sending SMS to ${recipient}. Status Code: ${resp.statusCode}`);
                                        }
                                    }).on('error', (err) => {
                                        reject(err.message);
                                    });
                                });
                            },
                        },
                    ],
                },
            },
        });
        try {
            await notifmeSdk.send({ sms: {} });
        } catch (error) {
            throw new Error(`Error sending SMS to ${recipient}: ${error.message}`);
        }
    }
}