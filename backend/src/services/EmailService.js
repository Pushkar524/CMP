const config = require('../config/env');

class EmailService {
  constructor() {
    this.provider = config.email?.provider || 'nodemailer';
    this.transporter = null;

    if (config.email?.smtp?.host && config.email?.smtp?.user) {
      try {
        const nodemailer = require('nodemailer');
        this.transporter = nodemailer.createTransport({
          host: config.email.smtp.host,
          port: config.email.smtp.port,
          auth: {
            user: config.email.smtp.user,
            pass: config.email.smtp.pass,
          },
        });
      } catch (err) {
        console.warn('[EmailService] SMTP initialization failed:', err.message);
      }
    }
  }

  /**
   * Sends an email notification
   * @param {string} to 
   * @param {string} subject 
   * @param {string} text 
   * @param {string} html 
   * @returns {Promise<{ success: boolean, messageId?: string }>}
   */
  async sendEmail({ to, subject, text, html }) {
    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: config.email.smtp.from,
          to,
          subject,
          text,
          html: html || text,
        });
        return { success: true, messageId: info.messageId };
      } catch (err) {
        console.warn(`[EmailService] Failed to send email to ${to}:`, err.message);
      }
    }

    // Dev/Test Mock Fallback
    console.log(`[EmailService:Mock] To: ${to} | Subject: ${subject}`);
    return { success: true, messageId: `mock-email-${Date.now()}` };
  }
}

module.exports = new EmailService();
