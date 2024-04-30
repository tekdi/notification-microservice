import { BadRequestException, Injectable } from "@nestjs/common";
import { NotificationService } from "../interface/notificationService";
import { NotificationDto } from "../dto/notificationDto.dto";
import { NotificationTemplates } from "src/modules/notification_events/entity/notificationTemplate.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotificationTemplateConfig } from "src/modules/notification_events/entity/notificationTemplateConfig.entity";
import NotifmeSdk from 'notifme-sdk';
import { ConfigService } from "@nestjs/config";
@Injectable()
export class SmsAdapter implements NotificationService {

    private readonly accountSid;
    private readonly authToken;

    constructor(
        private readonly configService: ConfigService,
        @InjectRepository(NotificationTemplates)
        private notificationEventsRepo: Repository<NotificationTemplates>,
        @InjectRepository(NotificationTemplateConfig)
        private notificationTemplateConfigRepository: Repository<NotificationTemplateConfig>
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
            console.log(receipients.length);
            throw new BadRequestException('Recipients cannot be empty');
        }

        // Check for empty strings in recipients
        if (receipients.some(recipient => recipient.trim() === '')) {
            throw new BadRequestException('Empty string found in recipients');
        }

        for (const recipient of receipients) {
            if (!this.isValidMobileNumber(recipient)) {
                throw new BadRequestException('Invalid Mobile Number');
            }
            try {
                const message = await client.messages.create({
                    from: '+12563056567',
                    to: `+91` + notificationDto.sms.receipients,
                    body: bodyText,
                });
                return "SMS notification sent sucessfully";
            }
            catch (error) {
                console.error('Error sending message:', error.message);
                return 'Failed to send sms notification';
            }
        }
    }
    private isValidMobileNumber(mobileNumber: string) {
        const regexExpForMobileNumber = /^[6-9]\d{9}$/gi;
        return regexExpForMobileNumber.test(mobileNumber);
    }
}
