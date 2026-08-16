import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Lightweight mailer wrapper around nodemailer.
 * Reads SMTP credentials from env; all other modules inject this
 * to send transactional email (OTP, notifications, etc.).
 */
@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: config.get<string>('SMTP_HOST'),
      port: Number(config.get<number>('SMTP_PORT') ?? 587),
      secure: config.get<string>('SMTP_SECURE') === 'true',
      auth: {
        user: config.get<string>('SMTP_USER'),
        pass: config.get<string>('SMTP_PASS'),
      },
    });
  }

  /**
   * Sends a plain-text + simple HTML email.
   * Throws on failure so callers can surface a user-friendly error.
   */
  async sendMail(opts: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<void> {
    const from = this.config.get<string>('SMTP_FROM');
    try {
      await this.transporter.sendMail({
        from,
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html ?? opts.text,
      });
      this.logger.log(`Email sent to ${opts.to} — "${opts.subject}"`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${opts.to}`, (err as Error).stack);
      throw err;
    }
  }
}
