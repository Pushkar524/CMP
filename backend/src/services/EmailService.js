const { Resend } = require('resend');
const nodemailer = require('nodemailer');
const config = require('../config/env');

class EmailService {
  constructor() {
    this.provider = config.email.provider;
    this.resendClient = null;
    this.transporter = null;

    if (this.provider === 'resend') {
      if (config.email.resendApiKey && config.email.resendApiKey !== 're_123456789') {
        this.resendClient = new Resend(config.email.resendApiKey);
      } else {
        console.warn('⚠️ [EmailService] Resend API key is not configured or using placeholder.');
      }
    }
  }

  /**
   * Initializes Nodemailer transporter if using nodemailer provider
   */
  async initTransporter() {
    if (this.transporter) return this.transporter;

    const { smtp } = config.email;
    const isPlaceholder = !smtp.user || smtp.user.includes('your_smtp');

    if (config.nodeEnv === 'development' && isPlaceholder) {
      console.log('📬 [EmailService] Initializing Ethereal test account for dev mode...');
      try {
        const testAccount = await nodemailer.createTestAccount();
        this.transporter = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });
        console.log(`📬 [EmailService] Ethereal ready (${testAccount.user})`);
      } catch (err) {
        console.error('❌ [EmailService] Failed to create Ethereal test account:', err.message);
      }
    } else {
      this.transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: {
          user: smtp.user,
          pass: smtp.pass,
        },
      });
    }

    return this.transporter;
  }

  /**
   * Base method to send an email with optimal deliverability
   * @param {Object} options
   * @param {string|string[]} options.to
   * @param {string} options.subject
   * @param {string} options.html
   * @param {string} options.text
   * @returns {Promise<{ success: boolean, id?: string, previewUrl?: string }>}
   */
  async sendEmail({ to, subject, html, text }) {
    const recipients = Array.isArray(to) ? to : [to];
    const plainText = text || html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();

    // Check if Resend is configured
    if (this.provider === 'resend') {
      const apiKey = config.email.resendApiKey;
      if (!apiKey || apiKey === 're_123456789') {
        throw new Error('Resend API key is not configured in .env (RESEND_API_KEY)');
      }

      if (!this.resendClient) {
        this.resendClient = new Resend(apiKey);
      }

      const fromAddress = config.email.resendFrom || 'SCLIP Compliance <onboarding@resend.dev>';

      try {
        const response = await this.resendClient.emails.send({
          from: fromAddress,
          to: recipients,
          subject,
          html,
          text: plainText,
          headers: {
            'X-Entity-Ref-ID': new Date().getTime().toString(),
          },
        });

        if (response.error) {
          console.error('❌ [EmailService] Resend error:', response.error);
          throw new Error(response.error.message || 'Failed to send email via Resend');
        }

        console.log(`✉️ [EmailService] Email sent via Resend to ${recipients.join(', ')} [ID: ${response.data.id}]`);
        return { success: true, id: response.data.id, provider: 'resend' };
      } catch (err) {
        console.error('❌ [EmailService] Resend dispatch error:', err.message);
        throw err;
      }
    }

    // Nodemailer fallback / provider
    const transporter = await this.initTransporter();
    if (!transporter) {
      throw new Error('Nodemailer transporter could not be initialized');
    }

    const fromAddress = config.email.smtp.from || 'SCLIP <alerts@sclip.local>';

    const info = await transporter.sendMail({
      from: fromAddress,
      to: recipients.join(', '),
      subject,
      html,
      text: plainText,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`🔗 [EmailService] Ethereal Preview URL: ${previewUrl}`);
    }

    console.log(`✉️ [EmailService] Email sent via Nodemailer to ${recipients.join(', ')} [ID: ${info.messageId}]`);
    return { success: true, id: info.messageId, previewUrl, provider: 'nodemailer' };
  }

  /**
   * High-deliverability corporate light-theme email template
   * Designed to pass modern spam filters (Gmail, Outlook, Yahoo)
   */
  wrapTemplate({ title, subtitle, contentHtml, actionButton }) {
    return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
          <!-- Top Header Brand -->
          <tr>
            <td style="padding: 24px 32px; background-color: #0f172a; border-bottom: 3px solid #2563eb;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td>
                    <span style="font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">SCLIP</span>
                    <span style="font-size: 13px; color: #94a3b8; margin-left: 8px;">Compliance Intelligence</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <h2 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #0f172a;">${title}</h2>
              ${subtitle ? `<p style="margin: 0 0 20px 0; font-size: 14px; color: #64748b;">${subtitle}</p>` : ''}
              
              <div style="font-size: 14px; line-height: 1.6; color: #334155;">
                ${contentHtml}
              </div>

              ${actionButton ? `
              <table border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0 16px 0;">
                <tr>
                  <td align="center" style="border-radius: 6px; background-color: #2563eb;">
                    <a href="${actionButton.url}" target="_blank" style="font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; display: inline-block;">
                      ${actionButton.text}
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>

          <!-- Corporate Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.5;">
              <p style="margin: 0 0 4px 0;">This is an automated notification from the SCLIP Compliance Management Platform.</p>
              <p style="margin: 0;">To update your notification preferences, access your user settings in the portal.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * Send a test email to verify configuration
   */
  async sendTestEmail({ to }) {
    const html = this.wrapTemplate({
      title: 'Email Delivery Verification',
      subtitle: 'SCLIP Notification Service is Active',
      contentHtml: `
        <p>Hello,</p>
        <p>This email confirms that your <strong>SCLIP Notification Service</strong> is properly connected and transmitting notifications in real-time.</p>
        
        <table border="0" cellpadding="10" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; margin: 16px 0;">
          <tr>
            <td style="font-size: 13px; color: #475569;">
              <strong>Delivery Status:</strong> Operational<br />
              <strong>Engine:</strong> ${this.provider.toUpperCase()}<br />
              <strong>Timestamp:</strong> ${new Date().toUTCString()}
            </td>
          </tr>
        </table>

        <p>You will receive automated notices when licenses approach expiry, compliance benchmarks shift, or prerequisites require renewal.</p>
      `,
      actionButton: {
        text: 'Open Compliance Portal',
        url: 'https://sclip.local/dashboard',
      },
    });

    const text = `SCLIP Compliance Notification Service Verification\n\nHello,\n\nThis email confirms that your SCLIP Notification Service is properly connected and transmitting notifications in real-time.\n\nStatus: Operational\nEngine: ${this.provider.toUpperCase()}\nTimestamp: ${new Date().toUTCString()}\n\nYou will receive automated notices when licenses approach expiry or require renewal.`;

    return await this.sendEmail({
      to,
      subject: 'SCLIP Notification Service Verification',
      html,
      text,
    });
  }

  /**
   * Expiry warning alert email
   */
  async sendExpiryAlert({ to, userName, licenseName, locationName, daysRemaining, expiryDate }) {
    const formattedDate = new Date(expiryDate).toLocaleDateString();

    const html = this.wrapTemplate({
      title: `Notice: License Expiry Approaching (${licenseName})`,
      subtitle: `Location: ${locationName}`,
      contentHtml: `
        <p>Dear ${userName || 'Compliance Manager'},</p>
        <p>This is a scheduled reminder that the following mandatory license is nearing its expiration date:</p>
        
        <table border="0" cellpadding="10" cellspacing="0" width="100%" style="background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; margin: 16px 0;">
          <tr>
            <td style="font-size: 13px; color: #92400e;">
              <strong>License:</strong> ${licenseName}<br />
              <strong>Facility:</strong> ${locationName}<br />
              <strong>Expiry Date:</strong> ${formattedDate}<br />
              <strong>Days Remaining:</strong> ${daysRemaining} day(s)
            </td>
          </tr>
        </table>

        <p>Please initiate the renewal submission to prevent compliance score deductions and regulatory penalties.</p>
      `,
      actionButton: {
        text: 'Review License Details',
        url: 'https://sclip.local/documents',
      },
    });

    const text = `Notice: License Expiry Approaching\n\nDear ${userName || 'Compliance Manager'},\n\nLicense: ${licenseName}\nLocation: ${locationName}\nExpiry Date: ${formattedDate}\nDays Remaining: ${daysRemaining}\n\nPlease initiate the renewal submission promptly.`;

    return await this.sendEmail({
      to,
      subject: `Notice: ${licenseName} approaches expiration in ${daysRemaining} days (${locationName})`,
      html,
      text,
    });
  }

  /**
   * Cascading Risk Alert Email
   */
  async sendCascadingRiskAlert({ to, userName, licenseName, locationName, dependentLicenses }) {
    const depsList = Array.isArray(dependentLicenses)
      ? dependentLicenses.map(d => `<li style="margin-bottom: 4px;">${d}</li>`).join('')
      : `<li>${dependentLicenses}</li>`;

    const html = this.wrapTemplate({
      title: `Alert: Cascading Dependency Block Detected`,
      subtitle: `Impact on operations at ${locationName}`,
      contentHtml: `
        <p>Dear ${userName || 'Compliance Manager'},</p>
        <p>The compliance engine has identified a prerequisite dependency issue:</p>
        
        <table border="0" cellpadding="10" cellspacing="0" width="100%" style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 6px; margin: 16px 0;">
          <tr>
            <td style="font-size: 13px; color: #991b1b;">
              <strong>Root License:</strong> ${licenseName}<br />
              <strong>Impacted Dependents:</strong>
              <ul style="margin: 8px 0 0 0; padding-left: 20px;">
                ${depsList}
              </ul>
            </td>
          </tr>
        </table>

        <p>Because the prerequisite license is invalid or pending, downstream renewals are blocked.</p>
      `,
      actionButton: {
        text: 'Inspect Dependency Graph',
        url: 'https://sclip.local/compliance-graph',
      },
    });

    const text = `Alert: Cascading Dependency Block Detected\n\nDear ${userName || 'Compliance Manager'},\n\nRoot License: ${licenseName}\nLocation: ${locationName}\nImpacted Dependents: ${Array.isArray(dependentLicenses) ? dependentLicenses.join(', ') : dependentLicenses}\n\nDownstream renewals are blocked until this license is renewed.`;

    return await this.sendEmail({
      to,
      subject: `Compliance Alert: Cascading Dependency Block on ${licenseName} (${locationName})`,
      html,
      text,
    });
  }
}

module.exports = new EmailService();
