import { BadRequestException, Inject, Injectable, forwardRef } from "@nestjs/common";
import { NotificationServiceInterface } from "../interface/notificationService";
import { NotificationDto } from "../dto/notificationDto.dto";
import { NotificationActions } from "src/modules/notification_events/entity/notificationActions.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotificationActionTemplates } from "src/modules/notification_events/entity/notificationActionTemplates.entity";
import { ConfigService } from "@nestjs/config";
import { NotificationLog } from "../entity/notificationLogs.entity";
import { NotificationService } from "../notification.service";
import { LoggerUtil } from "src/common/logger/LoggerUtil";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "src/common/utils/constant.util";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { SMS_PROVIDER } from "src/common/utils/constant.util";
import axios from "axios";
import { createReplacementsForMsg91, isValidMobileNumber } from "./smsAdapter.util";

@Injectable()
export class SmsAdapter implements NotificationServiceInterface {
    private readonly smsProvider: string;

    // For twillio
    private readonly twilioAccountSid: string;
    private readonly twilioAuthToken: string;
    private readonly twilioSmsFrom: string;

    // For AWS SNS 
    private readonly snsClient: SNSClient;
    private readonly awsSmsSenderId: string;

    // For MSG91
    private readonly authKey;
    private readonly msg91url;

    constructor(
        @Inject(forwardRef(() => NotificationService)) private readonly notificationServices: NotificationService,
        private readonly configService: ConfigService,
        @InjectRepository(NotificationActions)
        private notificationEventsRepo: Repository<NotificationActions>,
        @InjectRepository(NotificationActionTemplates)
        private notificationTemplateConfigRepository: Repository<NotificationActionTemplates>,
    ) {
        // Determine SMS provider from environment
        this.smsProvider = this.configService.get('SMS_PROVIDER', SMS_PROVIDER.AWS_SNS); // Default to AWS if not specified

        // Initialize provider-specific configurations
        if (this.smsProvider === SMS_PROVIDER.TWILIO) {
            this.twilioAccountSid = this.configService.get('TWILIO_ACCOUNT_SID');
            this.twilioAuthToken = this.configService.get('TWILIO_AUTH_TOKEN');
            this.twilioSmsFrom = this.configService.get('SMS_FROM');
            LoggerUtil.log(`SMS Provider configured: Twilio`);
        } else if (this.smsProvider === SMS_PROVIDER.AWS_SNS) {
            this.snsClient = new SNSClient({
                region: this.configService.get('AWS_REGION'),
                credentials: {
                    accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
                    secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
                },
            });
            this.awsSmsSenderId = this.configService.get('AWS_SNS_SENDER_ID');
            LoggerUtil.log(`SMS Provider configured: AWS SNS`);
        } else if (this.smsProvider === SMS_PROVIDER.MSG_91) {
            this.authKey = this.configService.get('MSG91_AUTH_KEY');
            this.msg91url = this.configService.get('MSG91_URL');
        } else {
            LoggerUtil.error(`Invalid SMS provider configured: ${this.smsProvider}`);
            throw new Error(`Invalid SMS provider: ${this.smsProvider}. Supported providers are TWILIO and AWS_SNS.`);
        }
    }

    async sendNotification(notificationDataArray) {
        const results = [];
        for (const notificationData of notificationDataArray) {
            try {
                const recipient = notificationData.recipient;
                if (!isValidMobileNumber(recipient)) {
                    throw new BadRequestException(ERROR_MESSAGES.INVALID_MOBILE_NUMBER);
                }

                const smsNotificationDto = {
                    body: notificationData.body,
                    recipient: recipient,
                    context: notificationData.context,
                    key: notificationData.key,
                    subject: notificationData.subject,
                    replacements: notificationData.replacements,
                };

                const result = await this.send(smsNotificationDto);

                results.push({
                    recipient: recipient,
                    status: 200,
                    result: SUCCESS_MESSAGES.SMS_NOTIFICATION_SEND_SUCCESSFULLY,
                });
            } catch (error) {
                LoggerUtil.error('Failed to send SMS notification', error);
                results.push({
                    recipient: notificationData.recipient,
                    status: 'error',
                    error: `SMS not sent: ${JSON.stringify(error)}`,
                });
            }
        }
        return results;
    }

    private createNotificationLog(notificationDto: NotificationDto, subject, key, body, recipient: string): NotificationLog {
        const notificationLogs = new NotificationLog();
        notificationLogs.context = notificationDto.context;
        notificationLogs.subject = subject;
        notificationLogs.body = body;
        notificationLogs.action = key;
        notificationLogs.type = 'sms';
        notificationLogs.recipient = recipient;
        return notificationLogs;
    }

    async send(notificationData) {
        const notificationLogs = this.createNotificationLog(
            notificationData,
            notificationData.subject,
            notificationData.key,
            notificationData.body,
            notificationData.recipient
        );

        try {
            let response;

            if (this.smsProvider === SMS_PROVIDER.TWILIO) {
                response = await this.sendViaTwilio(notificationData);
            } else if (this.smsProvider === SMS_PROVIDER.AWS_SNS) {
                response = await this.sendViaAwsSns(notificationData);
            } else if (this.smsProvider === SMS_PROVIDER.MSG_91) {
                createReplacementsForMsg91(notificationData.replacements);
                response = await this.sendViaMsg91(notificationData);
            }
            LoggerUtil.log(SUCCESS_MESSAGES.SMS_NOTIFICATION_SEND_SUCCESSFULLY);
            notificationLogs.status = true;
            await this.notificationServices.saveNotificationLogs(notificationLogs);
            return response;
        } catch (error) {
            LoggerUtil.error(ERROR_MESSAGES.SMS_NOTIFICATION_FAILED, error);
            notificationLogs.status = false;
            notificationLogs.error = error.toString();
            await this.notificationServices.saveNotificationLogs(notificationLogs);
            throw error;
        }
    }

    private async sendViaTwilio(notificationData) {
        const twilio = require('twilio');
        const client = twilio(this.twilioAccountSid, this.twilioAuthToken);

        const message = await client.messages.create({
            from: `${this.twilioSmsFrom}`,
            to: `+91${notificationData.recipient}`,
            body: notificationData.body,
        });

        return message;
    }

    private async sendViaAwsSns(notificationData) {
        const command = new PublishCommand({
            Message: notificationData.body,
            PhoneNumber: `+91${notificationData.recipient}`,
            MessageAttributes: {
                'AWS.SNS.SMS.SenderID': {
                    DataType: 'String',
                    StringValue: this.awsSmsSenderId,
                },
                'AWS.SNS.SMS.SMSType': {
                    DataType: 'String',
                    StringValue: 'Transactional',
                },
            },
        });

        return await this.snsClient.send(command);
    }

    private async sendViaMsg91(notificationData) {
        const response = await axios.post(this.msg91url, {
            template_id: notificationData.key,
            recipients: [
                {
                    mobiles: `91${notificationData.recipient}`,
                    ...notificationData.replacements
                }
            ]
        }, {
            headers: {
                "Content-Type": "application/json",
                accept: "application/json",
                authkey: this.authKey,
            },
        });
        LoggerUtil.log(SUCCESS_MESSAGES.SMS_NOTIFICATION_SEND_SUCCESSFULLY);
        return response;
    }
}