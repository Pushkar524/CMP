const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const config = require('../config/env');

class EmailService {
  constructor() {
    this.provider = config.email.provider || 'nodemailer';
    this.from = config.email.smtp.from;

    if (this.provider === 'resend' && config.email.resendApiKey) {
      this.resend = new Resend(config.email.resendApiKey);
    } else {
      this.transporter = nodemailer.createTransport({
        host: config.email.smtp.host || 'smtp.mailtrap.io',
        port: config.email.smtp.port || 2525,
        auth: {
          user: config.email.smtp.user || '',
          pass: config.email.smtp.pass || '',
        },
      });
    }
  }

  /**
   * Dispatches an email notification via configured provider
   * @param {{ to: string, subject: string, html: string, text?: string }}
   */
  async sendEmail({ to, subject, html, text }) {
    try {
      if (this.provider === 'resend' && this.resend) {
        const response = await this.resend.emails.send({
          from: this.from,
          to,
          subject,
          html,
          text: text || html.replace(/<[^>]*>?/gm, ''),
        });
        return { success: true, messageId: response?.id || 'resend-ok' };
      }

      // Default to Nodemailer
      const info = await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html,
        text: text || html.replace(/<[^>]*>?/gm, ''),
      });

      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.warn(`[EmailService] Notice: Email delivery skipped (${err.message})`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Generates formatted HTML for compliance alert notifications
   */
  buildAlertTemplate({ title, alertType, locationName, licenseName, details, daysLeft }) {
    const isCritical = alertType === 'LAPSED_LICENSE' || alertType === 'CASCADING_RISK';
    const bannerColor = isCritical ? '#dc2626' : '#f59e0b';

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: ${bannerColor}; color: white; padding: 18px 24px;">
          <h2 style="margin: 0; font-size: 20px;">${title}</h2>
          <span style="font-size: 12px; text-transform: uppercase; font-weight: bold; opacity: 0.9;">SCLIP Compliance Alert</span>
        </div>
        <div style="padding: 24px; color: #1e293b;">
          <p style="font-size: 15px; line-height: 1.5;">
            <strong>Location:</strong> ${locationName}<br/>
            <strong>License Type:</strong> ${licenseName}<br/>
            ${daysLeft !== undefined ? `<strong>Validity Status:</strong> Expiring in ${daysLeft} days<br/>` : ''}
          </p>
          <div style="background-color: #f8fafc; border-left: 4px solid ${bannerColor}; padding: 14px; margin: 18px 0; font-size: 14px; color: #475569;">
            ${details}
          </div>
          <p style="font-size: 13px; color: #64748b;">
            Please log in to the SCLIP Platform immediately to submit renewal documents or resolve dependencies.
          </p>
        </div>
        <div style="background-color: #f1f5f9; padding: 12px 24px; font-size: 11px; color: #94a3b8; text-align: center;">
          Secured by SCLIP Multi-Tenant Compliance Cloud &bull; Automated Regulatory Monitor
        </div>
      </div>
    `;
  }
}

module.exports = new EmailService();
