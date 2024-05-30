import { BadRequestException, Inject, Injectable, forwardRef } from "@nestjs/common";
import { NotificationServiceInterface } from "../interface/notificationService";
import { NotificationDto } from "../dto/notificationDto.dto";
import { NotificationTemplates } from "src/modules/notification_events/entity/notificationTemplate.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotificationTemplateConfig } from "src/modules/notification_events/entity/notificationTemplateConfig.entity";
import { ConfigService } from "@nestjs/config";
import { NotificationLog } from "../entity/notificationLogs.entity";
import { NotificationService } from "../notification.service";
import { LoggerService } from "src/common/logger/logger.service";
@Injectable()
export class SmsAdapter implements NotificationServiceInterface {

    private readonly accountSid;
    private readonly authToken;

    constructor(
        @Inject(forwardRef(() => NotificationService)) private readonly notificationServices: NotificationService,
        private readonly configService: ConfigService,
        @InjectRepository(NotificationTemplates)
        private notificationEventsRepo: Repository<NotificationTemplates>,
        @InjectRepository(NotificationTemplateConfig)
        private notificationTemplateConfigRepository: Repository<NotificationTemplateConfig>,
        private logger: LoggerService
    ) {
        this.accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
        this.authToken = this.configService.get('TWILIO_AUTH_TOKEN');
    }
    async sendNotification(notificationDto: NotificationDto) {
        const twilio = require('twilio');
        const client = twilio(this.accountSid, this.authToken);
        const { context, sms, replacements } = notificationDto;
        const { receipients } = sms;
        const notification_event = await this.notificationEventsRepo.findOne({ where: { context } })
        if (!notification_event) {
            this.logger.error('/Send SMS Notification', 'Template not found', context)
            throw new BadRequestException('Template not found')
        }

        // fetching template configuration details from template id...,
        const notification_details = await this.notificationTemplateConfigRepository.find({ where: { template_id: notification_event.id, type: 'sms' } });
        if (notification_details.length === 0) {
            this.logger.error('/Send Email Notification', `Template Config not found for this context : ${context}`, 'Not Found');
            throw new BadRequestException('Notification template config not define')
        }
        let bodyText = notification_details[0].body;
        //used for replscement tag 
        if (replacements && replacements.length > 0) {
            replacements.forEach((replacement, index) => {
                bodyText = bodyText.replace(`{#var${index}#}`, replacement);
            });
        }
        if (!receipients || receipients.length === 0) {
            throw new BadRequestException('Recipients cannot be empty');
        }

        // Check for empty strings in recipients
        if (receipients.some(recipient => recipient.trim() === '')) {
            throw new BadRequestException('Empty string found in recipients');
        }

        for (const recipient of receipients) {
            const notificationLogs = this.createNotificationLog(notificationDto, notification_details, notification_event, bodyText, recipient);
            try {
                if (!this.isValidMobileNumber(recipient)) {
                    throw new BadRequestException('Invalid Mobile Number');
                }
                const message = await client.messages.create({
                    from: '+12563056567',
                    to: `+91` + notificationDto.sms.receipients,
                    body: bodyText,
                });
                this.logger.log('SMS notification sent successfully')
                notificationLogs.status = true;
                await this.notificationServices.saveNotificationLogs(notificationLogs);
                return "SMS notification sent sucessfully";
            }
            catch (error) {
                this.logger.error(
                    `Failed to Send SMS Notification for ${context}`,
                    error,
                    '/Not able to send Notification',
                );
                notificationLogs.status = false;
                notificationLogs.error = error.toString();
                await this.notificationServices.saveNotificationLogs(notificationLogs);
                throw new Error('Failed to send sms notification' + error)
            }
        }
    }
    private isValidMobileNumber(mobileNumber: string) {
        const regexExpForMobileNumber = /^[6-9]\d{9}$/gi;
        return regexExpForMobileNumber.test(mobileNumber);
    }
    private createNotificationLog(notificationDto: NotificationDto, notificationDetail, notification_event, bodyText: string, receipients: string): NotificationLog {
        const notificationLogs = new NotificationLog()
        notificationLogs.context = notificationDto.context;
        notificationLogs.subject = notificationDetail[0].subject;
        notificationLogs.body = bodyText;
        notificationLogs.action = notification_event.key
        notificationLogs.type = 'sms';
        notificationLogs.recipient = receipients;
        return notificationLogs;
    }

}
