const config = require('../config/env');

class SmsService {
  constructor() {
    this.client = null;
    const accountSid = config.sms?.accountSid;
    const authToken = config.sms?.authToken;

    if (accountSid && accountSid.startsWith('AC') && authToken && !authToken.includes('your_')) {
      try {
        const twilio = require('twilio');
        this.client = twilio(accountSid, authToken);
        this.fromNumber = config.sms.fromNumber;
      } catch (err) {
        console.warn('[SmsService] Twilio initialization failed:', err.message);
      }
    }
  }

  /**
   * Sends an SMS notification
   * @param {string} to 
   * @param {string} message 
   * @returns {Promise<{ success: boolean, messageSid?: string }>}
   */
  async sendSms({ to, message }) {
    if (this.client && this.fromNumber) {
      try {
        const res = await this.client.messages.create({
          body: message,
          from: this.fromNumber,
          to,
        });
        return { success: true, messageSid: res.sid };
      } catch (err) {
        console.warn(`[SmsService] Failed to send SMS to ${to}:`, err.message);
      }
    }

    // Dev/Test Mock Fallback
    console.log(`[SmsService:Mock] To: ${to} | Message: ${message}`);
    return { success: true, messageSid: `mock-sms-${Date.now()}` };
  }
}

module.exports = new SmsService();
