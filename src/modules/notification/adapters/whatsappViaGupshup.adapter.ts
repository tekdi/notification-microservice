import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { NotificationLog } from '../entity/notificationLogs.entity';
import { NotificationService } from '../notification.service';
import { LoggerUtil } from 'src/common/logger/LoggerUtil';

export interface WhatsappTemplateMessage {
  to: string; // recipient with country code, "+" optional
  templateId: string; // Gupshup template ID of an approved template
  templateParams: string[]; // values for {{1}}, {{2}}, ...
  gupshupSource?: string; // sender number; falls back to GUPSHUP_SOURCE
  gupshupApiKey?: string; // falls back to GUPSHUP_API_KEY
}

/**
 * Sends WhatsApp template messages through Gupshup's template API
 * (POST {GUPSHUP_API_URL}/template/msg). Ported from origin/main.
 */
@Injectable()
export class WhatsappViaGupshupAdapter {
  private readonly apiUrl: string;
  private readonly appName?: string;

  constructor(
    @Inject(forwardRef(() => NotificationService))
    private readonly notificationServices: NotificationService,
    private readonly configService: ConfigService,
  ) {
    this.apiUrl = this.configService.get('GUPSHUP_API_URL', 'https://api.gupshup.io/wa/api/v1');
    this.appName = this.configService.get('GUPSHUP_APP_NAME') || undefined;
  }

  /** Returns { status: 200, ... } on success or { status: 4xx/5xx, recipient, error } */
  async sendTemplateMessage(message: WhatsappTemplateMessage) {
    const apiKey = message.gupshupApiKey || this.configService.get('GUPSHUP_API_KEY');
    const source = message.gupshupSource || this.configService.get('GUPSHUP_SOURCE');
    const destination = message.to.replace(/^\+/, '');

    const log = new NotificationLog();
    log.context = 'raw-whatsapp-gupshup';
    log.action = 'send-raw-whatsapp-gupshup';
    log.type = 'whatsapp';
    log.subject = null;
    log.body = `Template: ${message.templateId}`; // never the params: they hold the OTP
    log.recipient = destination;

    try {
      if (!apiKey || !source) {
        throw new Error('Gupshup API key and source number are required');
      }
      const form = new URLSearchParams({
        channel: 'whatsapp',
        source: source.replace(/^\+/, ''),
        destination,
        template: JSON.stringify({ id: message.templateId, params: message.templateParams || [] }),
      });
      if (this.appName) form.set('src.name', this.appName);

      const { data } = await axios.post(`${this.apiUrl}/template/msg`, form.toString(), {
        headers: { apikey: apiKey, 'Content-Type': 'application/x-www-form-urlencoded' },
        timeout: 15000,
      });
      if (data?.status !== 'submitted' && data?.status !== 'success') {
        throw new Error(`Gupshup returned status "${data?.status}": ${JSON.stringify(data)}`);
      }

      log.status = true;
      await this.notificationServices.saveNotificationLogs(log);
      LoggerUtil.log(`WhatsApp template ${message.templateId} submitted to Gupshup, messageId ${data.messageId}`);
      return {
        status: 200,
        to: message.to,
        result: 'WhatsApp template message submitted successfully via Gupshup',
        messageId: data.messageId,
      };
    } catch (e) {
      // Log only the message and Gupshup's reply: the axios error object carries the apikey header
      const reply = e.response?.data;
      const error = reply
        ? `Gupshup API error (${e.response.status}): ${typeof reply === 'string' ? reply : JSON.stringify(reply)}`
        : e.message;
      LoggerUtil.error('WhatsApp message via Gupshup failed', error);
      log.status = false;
      log.error = error.slice(0, 255);
      await this.notificationServices.saveNotificationLogs(log);
      return { status: e.response?.status || 500, recipient: message.to, error };
    }
  }
}
