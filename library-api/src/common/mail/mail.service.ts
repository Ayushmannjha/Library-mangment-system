import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface StudentCredentialsEmail {
  to: string;
  studentName: string;
  admissionNumber: string;
  portalUrl: string;
  loginEmail: string;
  password: string;
}

/**
 * Thin SMTP wrapper around nodemailer.
 *
 * SMTP credentials come from the environment (AGENTS.md Part 2, rule 14) —
 * never from source code. When SMTP_HOST is unset (local dev), emails are
 * skipped and a warning is logged instead of failing the student admission.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST');
    if (!host) {
      this.transporter = null;
      this.logger.warn(
        'SMTP_HOST is not configured — emails will be skipped. ' +
          'Set SMTP_HOST/SMTP_USER/SMTP_PASS in .env to enable sending.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: Number(this.config.get<string>('SMTP_PORT') ?? 587),
      secure: this.config.get<string>('SMTP_SECURE') === 'true',
      auth: {
        user: this.config.get<string>('SMTP_USER') ?? '',
        pass: this.config.get<string>('SMTP_PASS') ?? '',
      },
    });
  }

  /**
   * Sends the auto-generated student login credentials.
   * Returns `true` when the email was dispatched, `false` when it was
   * skipped (SMTP not configured) so callers can decide how to react.
   */
  async sendStudentCredentials(
    params: StudentCredentialsEmail,
  ): Promise<boolean> {
    if (!this.transporter) {
      this.logger.warn(
        `Skipping credentials email to ${params.to} (SMTP not configured). ` +
          `Generated password: ${params.password}`,
      );
      return false;
    }

    const subject = 'Your Library Student Portal login credentials';
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;">
        <h2 style="color:#1f2937;">Welcome to the Library, ${params.studentName}!</h2>
        <p style="color:#374151;">Your student portal account has been created.</p>
        <table style="border-collapse:collapse;margin:16px 0;">
          <tr>
            <td style="padding:6px 12px;color:#6b7280;">Admission No.</td>
            <td style="padding:6px 12px;font-weight:600;">${params.admissionNumber}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px;color:#6b7280;">Login email</td>
            <td style="padding:6px 12px;font-weight:600;">${params.loginEmail}</td>
          </tr>
          <tr>
            <td style="padding:6px 12px;color:#6b7280;">Password</td>
            <td style="padding:6px 12px;font-weight:600;">${params.password}</td>
          </tr>
        </table>
        <p style="color:#374151;">
          Portal: <a href="${params.portalUrl}" style="color:#2563eb;">${params.portalUrl}</a>
        </p>
        <p style="color:#6b7280;font-size:13px;">
          Please change this password after your first login. Never share it with anyone.
        </p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('SMTP_FROM'),
        to: params.to,
        subject,
        html,
      });
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send credentials email to ${params.to}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }
}
