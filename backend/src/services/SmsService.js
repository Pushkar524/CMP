const twilio = require('twilio');
const config = require('../config/env');

class SmsService {
  constructor() {
    this.accountSid = config.sms.accountSid;
    this.authToken = config.sms.authToken;
    this.fromNumber = config.sms.fromNumber;

    if (this.accountSid && this.authToken && !this.accountSid.includes('your_twilio')) {
      this.client = twilio(this.accountSid, this.authToken);
    } else {
      this.client = null;
    }
  }

  /**
   * Dispatches an SMS alert via Twilio
   * @param {{ to: string, message: string }}
   */
  async sendSms({ to, message }) {
    if (!this.client || !this.fromNumber) {
      console.warn(`[SmsService] Notice: SMS skipped (Twilio credentials not configured) -> To: ${to}`);
      return { success: false, reason: 'NOT_CONFIGURED' };
    }

    try {
      const response = await this.client.messages.create({
        body: message,
        from: this.fromNumber,
        to,
      });

      return { success: true, sid: response.sid };
    } catch (err) {
      console.warn(`[SmsService] Warning: Failed to send SMS (${err.message})`);
      return { success: false, error: err.message };
    }
  }
}

module.exports = new SmsService();
