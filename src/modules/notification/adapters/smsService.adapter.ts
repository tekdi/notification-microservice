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

export interface RawSmsData {
    to: string;
    body?: string;
    from?: string;
    templateId?: string;
    replacements?: { [key: string]: string };
  }

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
                // Don't modify the original replacements object, create a copy
                const processedReplacements = notificationData.replacements ? { ...notificationData.replacements } : {};
                createReplacementsForMsg91(processedReplacements);
                
                // Create a new notification data object with processed replacements
                const msg91NotificationData = {
                    ...notificationData,
                    replacements: processedReplacements
                };
                
                response = await this.sendViaMsg91(msg91NotificationData);
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

    private async sendRawSms(smsData: RawSmsData) {
        const notificationLog = new NotificationLog();
        notificationLog.context = 'raw-sms';
        notificationLog.body = smsData.body || 'Template-based SMS';
        notificationLog.action = 'send-raw-sms';
        notificationLog.type = 'sms';
        notificationLog.recipient = smsData.to;
    
        try {
            let response;
    
            // Prepare notification data with replacements if provided
            const notificationData = {
                recipient: smsData.to,
                body: smsData.body,
                replacements: smsData.replacements || {},
                templateId: smsData.templateId,
            };
    
            if (this.smsProvider === SMS_PROVIDER.TWILIO) {
                response = await this.sendViaTwilio(notificationData);
            } else if (this.smsProvider === SMS_PROVIDER.AWS_SNS) {
                response = await this.sendViaAwsSns(notificationData);
            } else if (this.smsProvider === SMS_PROVIDER.MSG_91) {
                if (!smsData.templateId) {
                    throw new BadRequestException('templateId is required for MSG91 provider');
                }
                response = await this.sendViaMsg91(notificationData, smsData.templateId);
            }
    
            notificationLog.status = true;
            await this.notificationServices.saveNotificationLogs(notificationLog);
            return response;
        } catch (error) {
            notificationLog.status = false;
            const errorMessage = error.message || error.toString();
            const errorDetails = error.status ? `Status: ${error.status}, ${errorMessage}` : errorMessage;
            notificationLog.error = errorDetails;
            await this.notificationServices.saveNotificationLogs(notificationLog);
            throw error;
        }
    }

    async sendRawSmsMessages(smsData) {
        const results = [];
        
        // Convert to array if not already an array
        const smsDataArray = Array.isArray(smsData) ? smsData : [smsData];
        
        for (const singleSmsData of smsDataArray) {
          try {
            // Validate based on provider
            if (this.smsProvider === SMS_PROVIDER.MSG_91) {
              // For MSG91, templateId is required, body is optional
              if (!singleSmsData.templateId) {
                throw new BadRequestException("templateId is required for MSG91");
              }
            } else {
              // For other providers, body is required
              if (!singleSmsData.body) {
                throw new BadRequestException("SMS body is required");
              }
            }
            
            const result = await this.sendRawSms(singleSmsData);
            
            if(result?.$metadata?.httpStatusCode === 200 && result?.MessageId) {
              results.push({
                to: singleSmsData.to,
                status: 200,
                result: SUCCESS_MESSAGES.SMS_NOTIFICATION_SEND_SUCCESSFULLY,
                messageId: result.MessageId || `sms-${Date.now()}`
              });
            } else {
              // Safe stringification - only include serializable data
              const safeResult = {
                data: result?.data,
                status: result?.status
              };
              results.push({
                to: singleSmsData.to,
                status: 400,
                error: `SMS not sent: ${JSON.stringify(safeResult)}`
              });
            }
          }
          catch (error) {
            LoggerUtil.error(ERROR_MESSAGES.SMS_NOTIFICATION_FAILED, error.message);
            
            // Safe error object without circular references
            results.push({
              recipient: singleSmsData.to,
              status: error.status || 500,
              error: error.message || error.toString()
            });
          }
        }
        return results;
    }


    private async sendViaMsg91(notificationData, customTemplateId?: string) {
        // Validate required configuration
        if (!this.authKey) {
            throw new Error('MSG91_AUTH_KEY is not configured');
        }
        if (!this.msg91url) {
            throw new Error('MSG91_URL is not configured');
        }
        
        // Use customTemplateId if provided, otherwise fall back to env variable
        const templateId = customTemplateId || this.configService.get('MSG91_DEFAULT_TEMPLATE_ID');
        if (!templateId) {
            throw new Error('Template ID is required. Either pass it in the request or configure MSG91_DEFAULT_TEMPLATE_ID');
        }
        
        // For MSG91, directly use all replacements as template variables
        const templateVariables: any = {};
        
        if (notificationData.replacements) {
            // Pass all replacements directly as template variables
            Object.keys(notificationData.replacements).forEach(key => {
                templateVariables[key] = notificationData.replacements[key];
            });
            
            // Legacy support: Map OTP to var if OTP is provided
            if (notificationData.replacements.OTP) {
                templateVariables.var = notificationData.replacements.OTP;
            }
        }
        
        const recipients = [{
            mobiles: `91${notificationData.recipient}`,
            ...templateVariables
        }];
        
        const requestData = {
            template_id: templateId,
            recipients: recipients
        };
        
        try {
            const axiosResponse = await axios.post(this.msg91url, requestData, {
                headers: {
                    "Content-Type": "application/json",
                    accept: "application/json",
                    authkey: this.authKey,
                },
                timeout: 30000
            });
            
            // Return only safe, serializable data to avoid circular references
            const safeResponse = {
                data: axiosResponse.data,
                status: axiosResponse.status,
                statusText: axiosResponse.statusText,
                $metadata: {
                    httpStatusCode: axiosResponse.status
                },
                MessageId: axiosResponse.data?.request_id || axiosResponse.data?.message_id || `msg91-${Date.now()}`
            };
            
            return safeResponse;
        } catch (error) {
            LoggerUtil.error(ERROR_MESSAGES.SMS_NOTIFICATION_FAILED, error.message);
            
            // Extract safe error information to avoid circular references
            const safeError: any = new Error(error.message || 'MSG91 API Error');
            
            if (error.response) {
                LoggerUtil.error(`MSG91 API Error Response: Status ${error.response.status}, Data: ${JSON.stringify(error.response.data, null, 2)}`);
                safeError.status = error.response.status;
                safeError.statusText = error.response.statusText;
                safeError.data = error.response.data;
            } else if (error.request) {
                safeError.message = 'No response received from MSG91 server';
            }
            
            throw safeError;
        }
    }
}