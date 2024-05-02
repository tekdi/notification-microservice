import { BadRequestException, Inject, Injectable, forwardRef } from "@nestjs/common";
import { NotificationServiceInterface } from "../interface/notificationService";
import { NotificationDto } from "../dto/notificationDto.dto";
import { NotificationTemplates } from "src/modules/notification_events/entity/notificationTemplate.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotificationTemplateConfig } from "src/modules/notification_events/entity/notificationTemplateConfig.entity";
import NotifmeSdk from 'notifme-sdk';
import { NotificationLog } from "../entity/notificationLogs.entity";
import { NotificationService } from "../notification.service";


@Injectable()
export class EmailAdapter implements NotificationServiceInterface {
    constructor(
        @Inject(forwardRef(() => NotificationService)) private readonly notificationServices: NotificationService,
        @InjectRepository(NotificationTemplates)
        private notificationEventsRepo: Repository<NotificationTemplates>,
        @InjectRepository(NotificationTemplateConfig)
        private notificationTemplateConfigRepository: Repository<NotificationTemplateConfig>,
    ) { }
    async sendNotification(notificationDto: NotificationDto) {
        const { context, email, replacements } = notificationDto;
        const { receipients } = email;

        // Fetching template id by context from template events
        const notification_event = await this.notificationEventsRepo.findOne({ where: { context } });
        if (!notification_event) {
            throw new BadRequestException('Template not found');
        }

        // Fetching template configuration details from template id
        const notification_details = await this.notificationTemplateConfigRepository.find({ where: { template_id: notification_event.id, type: 'email' } });
        if (notification_details.length === 0) {
            throw new BadRequestException('Notification template config not defined');
        }

        let bodyText = notification_details[0].body;
        // Used for replacement tags
        if (replacements && replacements.length > 0) {
            replacements.forEach((replacement, index) => {
                bodyText = bodyText.replace(`{#var${index}#}`, replacement);
            });
        }

        if (!receipients || receipients.length === 0 || receipients.some(recipient => recipient.trim() === '')) {
            throw new BadRequestException('Invalid recipients');
        }

        for (const recipient of receipients) {
            if (!recipient || !this.isValidEmail(recipient)) {
                throw new BadRequestException('Invalid Email ID or Request Format');
            }
            const emailConfig = this.getEmailConfig(context);
            const notifmeSdk = new NotifmeSdk(emailConfig);
            const notificationLogs = this.createNotificationLog(notificationDto, notification_details, bodyText, recipient);
            try {
                const result = await notifmeSdk.send({
                    email: {
                        from: emailConfig.email.from,
                        to: recipient,
                        subject: notification_details[0].subject,
                        html: bodyText,
                    },
                });
                notificationLogs.status = true;
                await this.notificationServices.saveNotificationLogs(notificationLogs);
                return 'Email notification sent successfully';
            } catch (error) {
                notificationLogs.status = false;
                notificationLogs.error = error.toString();
                await this.notificationServices.saveNotificationLogs(notificationLogs);

                throw new Error('Failed to send email notification' + error);
            }
        }
    }

    private createNotificationLog(notificationDto: NotificationDto, notificationDetail, bodyText: string, recipient: string): NotificationLog {
        const notificationLogs = new NotificationLog();
        notificationLogs.context = notificationDto.context;
        notificationLogs.subject = notificationDetail[0].subject;
        notificationLogs.body = bodyText;
        notificationLogs.type = 'email';
        notificationLogs.recipient = recipient;
        return notificationLogs;
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