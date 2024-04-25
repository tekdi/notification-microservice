import { BadRequestException, Injectable } from "@nestjs/common";
import { NotificationService } from "../interface/notificationService";
import { NotificationDto } from "../dto/notificationDto.dto";
import { NotificationTemplates } from "src/modules/notification_events/entity/notificationTemplate.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotificationTemplateConfig } from "src/modules/notification_events/entity/notificationTemplateConfig.entity";
import NotifmeSdk from 'notifme-sdk';

@Injectable()
export class EmailAdapter implements NotificationService {
    constructor(
        @InjectRepository(NotificationTemplates)
        private notificationEventsRepo: Repository<NotificationTemplates>,
        @InjectRepository(NotificationTemplateConfig)
        private notificationTemplateConfigRepository: Repository<NotificationTemplateConfig>
    ) { }
    async sendNotification(notificationDto: NotificationDto) {
        const { context, email, replacements } = notificationDto;
        const { receipients } = email;
        // fetching template id by context(request body) from template events,
        const notification_event = await this.notificationEventsRepo.findOne({ where: { context } })
        if (!notification_event) {
            throw new BadRequestException('Template not found')
        }
        // fetching template configuration details from template id...,
        const notification_details = await this.notificationTemplateConfigRepository.find({ where: { template_id: notification_event.id, type: 'email' } });
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
            throw new BadRequestException('Receipients cannot be empty');
        }
        for (const recipient of receipients) {
            if (!recipient || !this.isValidEmail(recipient)) {
                throw new BadRequestException('Invalid Email ID or Request Format');
            }

            const emailConfig = this.getEmailConfig(context);
            const notifmeSdk = new NotifmeSdk(emailConfig);

            try {
                await notifmeSdk.send({
                    email: {
                        from: emailConfig.email.from,
                        to: recipient,
                        subject: notification_details[0].subject,
                        html: bodyText,
                    },
                });
                return 'Email notification sent successfully';
            } catch (error) {
                throw new BadRequestException('Failed to send email');
            }
        }
    }

    private getEmailConfig(context: string) {
        const emailType = context.startsWith('ITI') ? process.env.ITI_EMAIL_TYPE : process.env.EMAIL_TYPE;
        return {
            useNotificationCatcher: false,
            channels: {
                email: {
                    providers: [
                        {
                            type: emailType,
                            host: process.env.EMAIL_HOST,
                            port: process.env.EMAIL_PORT,
                            secure: false,
                            auth: {
                                user: process.env.EMAIL_USER,
                                pass: process.env.EMAIL_PASS,
                            },
                        },
                    ],
                },
            },
            email: {
                from: context.startsWith('ITI') ? process.env.ITI_EMAIL_FROM : process.env.EMAIL_FROM,
            },
        };
    }

    private isValidEmail(email: string) {
        const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
        return emailRegexp.test(email);
    }
}