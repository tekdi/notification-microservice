import { BadRequestException, Inject, Injectable, forwardRef } from "@nestjs/common";
import { NotificationServiceInterface } from "../interface/notificationService";
import { NotificationDto } from "../dto/notificationDto.dto";
import { NotificationActions } from "src/modules/notification_events/entity/notificationActions.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { NotificationActionTemplates } from "src/modules/notification_events/entity/notificationActionTemplates.entity";
import NotifmeSdk from 'notifme-sdk';
import { NotificationLog } from "../entity/notificationLogs.entity";
import { NotificationService, maskEmail } from "../notification.service";
import { LoggerUtil } from "src/common/logger/LoggerUtil";
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from "src/common/utils/constant.util";

/**
 * Interface for raw email data
 */
export interface RawEmailData {
    to: string | string[];
    subject: string;
    body: string;
    from?: string;
    isHtml?: boolean;
    cc?: string[];
    bcc?: string[];
}

@Injectable()
export class EmailAdapter implements NotificationServiceInterface {
    constructor(
        @Inject(forwardRef(() => NotificationService)) private readonly notificationServices: NotificationService
    ) { }

    /**
     * Sends notifications using template-based approach
     * @param notificationDataArray Array of notification data objects
     * @returns Results of notification attempts
     */
    async sendNotification(notificationDataArray, traceId?: string) {
        const results = [];
        for (const notificationData of notificationDataArray) {

            try {
                const recipient = notificationData.recipient;
                if (!recipient || !this.isValidEmail(recipient)) {
                    throw new BadRequestException(ERROR_MESSAGES.INVALID_EMAIL);
                }

                const loggingData = { ...notificationData };
                if (loggingData.recipient && typeof loggingData.recipient === 'string') {
                    loggingData.recipient = maskEmail(loggingData.recipient);
                }
                if (loggingData.cc && Array.isArray(loggingData.cc)) {
                    loggingData.cc = loggingData.cc.map((email: string) => maskEmail(email));
                }
                if (loggingData.bcc && Array.isArray(loggingData.bcc)) {
                    loggingData.bcc = loggingData.bcc.map((email: string) => maskEmail(email));
                }
                delete loggingData.body;
                if (loggingData.replacements && loggingData.replacements['{OTP}']) {
                    loggingData.replacements = { ...loggingData.replacements };
                    delete loggingData.replacements['{OTP}'];
                }

                LoggerUtil.log(`ADAPTER_PREP ${traceId}`, traceId, '', 'info', { ...loggingData, status: 'ADAPTER_PREP', traceId: traceId });

                const startTime = Date.now();
                const result = await this.send(notificationData, traceId);
                const timeTakenInMs = Date.now() - startTime;

                if (result.status === 'success') {
                    LoggerUtil.log(`SENT ${traceId}`, traceId, '', 'info', { ...result, status: 'SENT', traceId: traceId, timeTaken: timeTakenInMs });
                    results.push({
                        recipient: recipient,
                        status: 200,
                        result: SUCCESS_MESSAGES.EMAIL_NOTIFICATION_SEND_SUCCESSFULLY
                    });
                } else {
                    LoggerUtil.error(`FAILED ${traceId}`, result.message, traceId, '', { status: 'FAILED', traceId: traceId, timeTaken: timeTakenInMs });
                    results.push({
                        recipient: recipient,
                        status: 'error',
                        error: `Email not sent: ${JSON.stringify(result.message)}`
                    });
                }
            }
            catch (error) {
                const timeTakenInMs = Date.now() - (error.startTime || Date.now());
                LoggerUtil.error(`FAILED ${traceId}`, error.message, traceId, '', { status: 'FAILED', traceId: traceId, timeTaken: timeTakenInMs });
                results.push({
                    recipient: notificationData.recipient,
                    status: 'error',
                    error: error.message
                });
            }
        }
        return results;
    }

    /**
     * New method for sending raw emails without templates
     * @param rawEmailDataArray Array of raw email data objects
     * @returns Results of raw email sending attempts
     */
    async sendRawEmails(traceId, emailData) {
        const results = [];

        // Convert to array if not already an array
        const emailDataArray = Array.isArray(emailData) ? emailData : [emailData];

        for (const singleEmailData of emailDataArray) {
            try {

                if (!singleEmailData.to || !this.isValidEmail(singleEmailData.to)) {
                    throw new BadRequestException(ERROR_MESSAGES.INVALID_EMAIL);
                }

                if (!singleEmailData.subject || !singleEmailData.body) {
                    throw new BadRequestException("Subject and Email body are required");
                }

                const loggingData = { ...singleEmailData };
                if (loggingData.to) {
                    if (Array.isArray(loggingData.to)) {
                        loggingData.to = loggingData.to.map((email: string) => maskEmail(email));
                    } else if (typeof loggingData.to === 'string') {
                        loggingData.to = maskEmail(loggingData.to as string);
                    }
                }
                if (loggingData.cc && Array.isArray(loggingData.cc)) {
                    loggingData.cc = loggingData.cc.map((email: string) => maskEmail(email));
                }
                if (loggingData.bcc && Array.isArray(loggingData.bcc)) {
                    loggingData.bcc = loggingData.bcc.map((email: string) => maskEmail(email));
                }
                delete loggingData.body;
                if (loggingData.replacements && loggingData.replacements['{OTP}']) {
                    loggingData.replacements = { ...loggingData.replacements };
                    delete loggingData.replacements['{OTP}'];
                }
                LoggerUtil.log(`ADAPTER_PREP ${traceId}`, traceId, '', 'info', { ...loggingData, status: 'ADAPTER_PREP', traceId: traceId });

                const startTime = Date.now();
                const result = await this.sendRawEmail(singleEmailData);
                const timeTakenInMs = Date.now() - startTime;

                if (result.status === 'success') {
                    LoggerUtil.log(`SENT ${traceId}`, traceId, '', 'info', { ...result, status: 'SENT', traceId: traceId, timeTaken: timeTakenInMs });
                    results.push({
                        to: singleEmailData.to,
                        status: 200,
                        result: SUCCESS_MESSAGES.EMAIL_NOTIFICATION_SEND_SUCCESSFULLY,
                        messageId: result.messageId || `email-${Date.now()}`
                    });
                } else {
                    LoggerUtil.error(`FAILED ${traceId}`, JSON.stringify(result), traceId, '', { status: 'FAILED', traceId: traceId, timeTaken: timeTakenInMs });
                    results.push({
                        to: singleEmailData.to,
                        status: 400,
                        error: `Email not sent: ${JSON.stringify(result.errors)}`
                    });
                }
            }
            catch (error) {
                const timeTakenInMs = Date.now() - (error.startTime || Date.now());
                LoggerUtil.error(`FAILED ${traceId}`, error.message || error.toString(), traceId, '', { status: 'FAILED', traceId: traceId, timeTaken: timeTakenInMs });
                results.push({
                    recipient: singleEmailData.to,
                    status: 500,
                    error: error.message || error.toString()
                });
            }
        }
        return results;
    }

    /**
     * Creates a notification log entry
     */
    private createNotificationLog(notificationDto: NotificationDto, subject, key, bodyText: string, recipient: string): NotificationLog {
        const notificationLogs = new NotificationLog();
        notificationLogs.context = notificationDto.context;
        notificationLogs.subject = subject;
        notificationLogs.body = bodyText;
        notificationLogs.action = key
        notificationLogs.type = 'email';
        notificationLogs.recipient = recipient;
        return notificationLogs;
    }

    /**
     * Creates a raw notification log entry without requiring NotificationDto
     */
    private createRawNotificationLog(subject: string, bodyText: string, recipient: string): NotificationLog {
        const notificationLogs = new NotificationLog();
        notificationLogs.context = 'raw-email';
        notificationLogs.subject = subject;
        notificationLogs.body = bodyText;
        notificationLogs.action = 'send-raw-email';
        notificationLogs.type = 'email';
        notificationLogs.recipient = recipient;
        return notificationLogs;
    }

    /**
     * Gets email configuration
     */
    private getEmailConfig(context: string) {
        return {
            useNotificationCatcher: false,
            channels: {
                email: {
                    providers: [
                        {
                            type: process.env.EMAIL_TYPE,
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
                from: process.env.EMAIL_FROM,
            },
        };
    }

    /**
     * Validates email format
     */
    private isValidEmail(email: string) {
        const emailRegexp = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
        return emailRegexp.test(email);
    }

    /**
     * Sends template-based email
     */
    async send(notificationData, traceId) {
        // Note: CC and BCC are not logged in notificationLogs for privacy/security reasons
        // The NotificationLog entity doesn't have CC/BCC fields, and BCC is meant to be hidden
        const notificationLogs = this.createNotificationLog(notificationData, notificationData.subject, notificationData.key, notificationData.body, notificationData.recipient);
        try {
            const emailConfig = this.getEmailConfig(notificationData.context);
            const notifmeSdk = new NotifmeSdk(emailConfig);

            const result = await notifmeSdk.send({
                email: {
                    from: emailConfig.email.from,
                    to: notificationData.recipient,
                    subject: notificationData.subject,
                    html: notificationData.body,
                    ...(notificationData.cc && Array.isArray(notificationData.cc) && notificationData.cc.length > 0 ? { cc: notificationData.cc } : {}),
                    ...(notificationData.bcc && Array.isArray(notificationData.bcc) && notificationData.bcc.length > 0 ? { bcc: notificationData.bcc } : {}),
                },
            });
            if (result.status === 'success') {
                notificationLogs.status = true;
                await this.notificationServices.saveNotificationLogs(notificationLogs);
                LoggerUtil.log(`traceId: ${traceId} SUCCESS_MESSAGES.EMAIL_NOTIFICATION_SEND_SUCCESSFULLY`, traceId, "", "info",);
                return result;
            }
            else {
                throw new Error(`Email not send ${JSON.stringify(result.errors)}`)
            }
        }
        catch (e) {
            LoggerUtil.error(ERROR_MESSAGES.EMAIL_NOTIFICATION_FAILED, e.message);
            notificationLogs.status = false;
            notificationLogs.error = e.message;
            await this.notificationServices.saveNotificationLogs(notificationLogs);
            return e;
        }
    }

    /**
     * Sends raw email without template
     * @param emailData Raw email data
     * @returns Result of email sending attempt
     */
    async sendRawEmail(emailData: RawEmailData) {
        // Note: CC and BCC are not logged in notificationLogs for privacy/security reasons
        // The NotificationLog entity doesn't have CC/BCC fields, and BCC is meant to be hidden
        const notificationLogs = this.createRawNotificationLog(
            emailData.subject,
            emailData.body,
            emailData.to as string
        );

        try {
            const emailConfig = this.getEmailConfig('raw-email');
            const notifmeSdk = new NotifmeSdk(emailConfig);

            const result = await notifmeSdk.send({
                email: {
                    from: emailData.from || emailConfig.email.from,
                    to: emailData.to,
                    subject: emailData.subject,
                    ...(emailData.isHtml !== false ? { html: emailData.body } : { text: emailData.body }),
                    ...(emailData.cc && Array.isArray(emailData.cc) && emailData.cc.length > 0 ? { cc: emailData.cc } : {}),
                    ...(emailData.bcc && Array.isArray(emailData.bcc) && emailData.bcc.length > 0 ? { bcc: emailData.bcc } : {}),
                },
            });

            if (result.status === 'success') {
                notificationLogs.status = true;
                await this.notificationServices.saveNotificationLogs(notificationLogs);
                LoggerUtil.log(SUCCESS_MESSAGES.EMAIL_NOTIFICATION_SEND_SUCCESSFULLY);
                return {
                    ...result,
                    messageId: result.id || `email - ${Date.now()}`
                };
            } else {
                throw new Error(`Email not sent: ${JSON.stringify(result.errors)}`)
            }
        } catch (e) {
            LoggerUtil.error(ERROR_MESSAGES.EMAIL_NOTIFICATION_FAILED, e);
            notificationLogs.status = false;
            notificationLogs.error = e.toString();
            await this.notificationServices.saveNotificationLogs(notificationLogs);
            return {
                status: 'error',
                errors: [e.message || e.toString()]
            };
        }
    }
}