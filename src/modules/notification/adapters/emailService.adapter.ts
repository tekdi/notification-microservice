import {
  BadRequestException,
  Inject,
  Injectable,
  forwardRef,
} from '@nestjs/common';
import { NotificationServiceInterface } from '../interface/notificationService';
import { NotificationDto } from '../dto/notificationDto.dto';
import NotifmeSdk from 'notifme-sdk';
import { NotificationLog } from '../entity/notificationLogs.entity';
import { NotificationService } from '../notification.service';
import { LoggerUtil } from 'src/common/logger/LoggerUtil';
import {
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
} from 'src/common/utils/constant.util';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

/**
 * Interface for raw email data
 */
export interface RawEmailData {
  to: string;
  subject: string;
  body: string;
  from?: string;
  fromName?: string; // NEW: Optional sender name
  isHtml?: boolean;
}

@Injectable()
export class EmailAdapter implements NotificationServiceInterface {
  private provider: 'smtp' | 'sendgrid' = 'smtp';
  private isConfigured = false;
  constructor(
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationServices: NotificationService,
    private readonly configService: ConfigService
  ) {
    this.provider = (this.configService.get('EMAIL_PROVIDER') || 'smtp') as
      | 'smtp'
      | 'sendgrid';
    if (this.provider === 'smtp' && this.hasSmtpConfig()) {
      this.isConfigured = true;
    }

    if (this.provider === 'sendgrid' && this.hasSendGridConfig()) {
      sgMail.setApiKey(this.configService.get('SENDGRID_API_KEY'));
      this.isConfigured = true;
    }

    if (!this.isConfigured) {
      console.warn('EmailAdapter not configured: Missing required settings.');
      LoggerUtil.error(ERROR_MESSAGES.EMAIL_ADAPTER_NOT_CONFIGURED);
    }
  }

  private hasSmtpConfig(): boolean {
    return (
      !!this.configService.get('EMAIL_HOST') &&
      !!this.configService.get('EMAIL_PORT') &&
      !!this.configService.get('EMAIL_USER') &&
      !!this.configService.get('EMAIL_PASS')
    );
  }

  private hasSendGridConfig(): boolean {
    return !!(
      this.configService.get('SENDGRID_API_KEY') &&
      this.configService.get('EMAIL_FROM')
    );
  }
  /**
   * Sends notifications using template-based approach
   * @param notificationDataArray Array of notification data objects
   * @returns Results of notification attempts
   */
  async sendNotification(notificationDataArray) {
    const results = [];
    for (const notificationData of notificationDataArray) {
      try {
        const recipient = notificationData.recipient;
        if (!recipient || !this.isValidEmail(recipient)) {
          throw new BadRequestException(ERROR_MESSAGES.INVALID_EMAIL);
        }
        const result = await this.send(notificationData);
        if (result.status === 'success') {
          results.push({
            recipient: recipient,
            status: 200,
            result: SUCCESS_MESSAGES.EMAIL_NOTIFICATION_SEND_SUCCESSFULLY,
          });
        } else {
          results.push({
            recipient: recipient,
            status: 'error',
            error: `Email not sent: ${JSON.stringify(result.errors)}`,
          });
        }
      } catch (error) {
        LoggerUtil.error(ERROR_MESSAGES.EMAIL_NOTIFICATION_FAILED, error);
        results.push({
          recipient: notificationData.recipient,
          status: 'error',
          error: error.toString(),
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
  async sendRawEmails(emailData) {
    const results = [];

    // Convert to array if not already an array
    const emailDataArray = Array.isArray(emailData) ? emailData : [emailData];

    for (const singleEmailData of emailDataArray) {
      try {
        if (!singleEmailData.to || !this.isValidEmail(singleEmailData.to)) {
          throw new BadRequestException(ERROR_MESSAGES.INVALID_EMAIL);
        }

        if (!singleEmailData.subject || !singleEmailData.body) {
          throw new BadRequestException('Subject and Email body are required');
        }

        const result = await this.sendRawEmail(singleEmailData);
        if (result.status === 'success') {
          results.push({
            to: singleEmailData.to,
            status: 200,
            result: SUCCESS_MESSAGES.EMAIL_NOTIFICATION_SEND_SUCCESSFULLY,
            messageId: result.messageId || `email-${Date.now()}`,
          });
        } else {
          results.push({
            to: singleEmailData.to,
            status: 400,
            error: `Email not sent: ${JSON.stringify(result.errors)}`,
          });
        }
      } catch (error) {
        LoggerUtil.error(ERROR_MESSAGES.EMAIL_NOTIFICATION_FAILED, error);
        results.push({
          recipient: singleEmailData.to,
          status: 500,
          error: error.message || error.toString(),
        });
      }
    }
    return results;
  }

  /**
   * Creates a notification log entry
   */
  private createNotificationLog(
    notificationDto: NotificationDto,
    subject,
    key,
    bodyText: string,
    recipient: string
  ): NotificationLog {
    const notificationLogs = new NotificationLog();
    notificationLogs.context = notificationDto.context;
    notificationLogs.subject = subject;
    notificationLogs.body = bodyText;
    notificationLogs.action = key;
    notificationLogs.type = 'email';
    notificationLogs.recipient = recipient;
    return notificationLogs;
  }

  /**
   * Creates a raw notification log entry without requiring NotificationDto
   */
  private createRawNotificationLog(
    subject: string,
    bodyText: string,
    recipient: string
  ): NotificationLog {
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
  private getEmailConfig(
    context: string,
    emailFromName?: string,
    emailFrom?: string
  ) {
    const fromName = emailFromName || process.env.EMAIL_FROM_NAME || ''; // fallback if not set
    const fromEmail = emailFrom || process.env.EMAIL_FROM;
    return {
      useNotificationCatcher: false,
      channels: {
        email: {
          providers: [
            {
              type: process.env.EMAIL_PROVIDER || 'smtp',
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
        from: `${fromName} <${fromEmail}>`, // formatted name and email
      },
    };
  }

  /**
   * Validates email format
   */
  private isValidEmail(email: string) {
    const emailRegexp =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    return emailRegexp.test(email);
  }

  /**
   * Sends template-based email
   */
  async send(notificationData) {
    const notificationLogs = this.createNotificationLog(
      notificationData,
      notificationData.subject,
      notificationData.key,
      notificationData.body,
      notificationData.recipient
    );
    let result;
    try {
      if (this.provider === 'smtp') {
        const emailConfig = this.getEmailConfig(
          notificationData.context,
          notificationData.emailFromName,
          notificationData.emailFrom
        );
        const notifmeSdk = new NotifmeSdk(emailConfig);
        result = await notifmeSdk.send({
          email: {
            from: emailConfig.email.from,
            to: notificationData.recipient,
            subject: notificationData.subject,
            html: notificationData.body,
          },
        });
      } else if (this.provider === 'sendgrid') {
        // NEW: Use database email sender with fallback to environment
        const fromEmail =
          notificationData.emailFrom || this.configService.get('EMAIL_FROM');
        const fromName =
          notificationData.emailFromName ||
          this.configService.get('EMAIL_FROM_NAME') ||
          '';
        const formattedFrom = `${fromName} <${fromEmail}>`;
        const msg = {
          to: notificationData.recipient,
          from: formattedFrom,
          subject: notificationData.subject,
          html: notificationData.body,
        };
        const sgResponse = await sgMail.send(msg);
        result = {
          status: sgResponse[0]?.statusCode === 202 ? 'success' : 'error',
          id: sgResponse[0]?.headers['x-message-id'] || null,
          errors:
            sgResponse[0]?.statusCode !== 202 ? sgResponse[0]?.body : undefined,
        };
      }
      if (result.status === 'success') {
        notificationLogs.status = true;
        await this.notificationServices.saveNotificationLogs(notificationLogs);
        LoggerUtil.log(SUCCESS_MESSAGES.EMAIL_NOTIFICATION_SEND_SUCCESSFULLY);
        return result;
      } else {
        throw new Error(`Email not send ${JSON.stringify(result.errors)}`);
      }
    } catch (e) {
      LoggerUtil.error(ERROR_MESSAGES.EMAIL_NOTIFICATION_FAILED, e);
      notificationLogs.status = false;
      notificationLogs.error = e.toString();
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
    const notificationLogs = this.createRawNotificationLog(
      emailData.subject,
      emailData.body,
      emailData.to
    );

    try {
      const emailConfig = this.getEmailConfig(
        'raw-email',
        emailData.fromName,
        emailData.from
      );
      const notifmeSdk = new NotifmeSdk(emailConfig);

      // Determine content type (HTML or plain text)
      const emailPayload: any = {
        from: emailData.from || emailConfig.email.from,
        to: emailData.to,
        subject: emailData.subject,
      };

      // Set content as HTML or text based on isHtml flag
      if (emailData.isHtml !== false) {
        emailPayload.html = emailData.body;
      } else {
        emailPayload.text = emailData.body;
      }

      const result = await notifmeSdk.send({
        email: emailPayload,
      });

      if (result.status === 'success') {
        notificationLogs.status = true;
        await this.notificationServices.saveNotificationLogs(notificationLogs);
        LoggerUtil.log(SUCCESS_MESSAGES.EMAIL_NOTIFICATION_SEND_SUCCESSFULLY);
        return {
          ...result,
          messageId: result.id || `email-${Date.now()}`,
        };
      } else {
        throw new Error(`Email not sent: ${JSON.stringify(result.errors)}`);
      }
    } catch (e) {
      LoggerUtil.error(ERROR_MESSAGES.EMAIL_NOTIFICATION_FAILED, e);
      notificationLogs.status = false;
      notificationLogs.error = e.toString();
      await this.notificationServices.saveNotificationLogs(notificationLogs);
      return {
        status: 'error',
        errors: [e.message || e.toString()],
      };
    }
  }
}
