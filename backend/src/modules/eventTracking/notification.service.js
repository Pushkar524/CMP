const prisma = require('../../config/db');
const emailService = require('../../services/EmailService');
const smsService = require('../../services/SmsService');
const { BadRequestError, NotFoundError } = require('../../utils/errors');

class NotificationService {
  /**
   * Retrieves notification preferences for a user
   */
  async getUserPreferences(userId) {
    const preferences = await prisma.notificationPreference.findMany({
      where: { user_id: userId },
    });

    // Ensure all 3 alert types exist
    const alertTypes = ['EXPIRY_WARNING', 'LAPSED_LICENSE', 'CASCADING_RISK'];
    const existingTypes = preferences.map((p) => p.alert_type);

    const missingTypes = alertTypes.filter((t) => !existingTypes.includes(t));
    if (missingTypes.length > 0) {
      await prisma.notificationPreference.createMany({
        data: missingTypes.map((t) => ({
          user_id: userId,
          alert_type: t,
          email_enabled: true,
          sms_enabled: false,
          in_app_enabled: true,
        })),
      });

      return await prisma.notificationPreference.findMany({
        where: { user_id: userId },
      });
    }

    return preferences;
  }

  /**
   * Updates notification preferences for a user
   */
  async updatePreferences(userId, preferences) {
    if (!Array.isArray(preferences)) {
      throw new BadRequestError('Preferences must be an array of settings.');
    }

    const updated = [];
    for (const pref of preferences) {
      const { alert_type, email_enabled, sms_enabled, in_app_enabled } = pref;
      if (!alert_type) continue;

      const record = await prisma.notificationPreference.upsert({
        where: {
          user_id_alert_type: {
            user_id: userId,
            alert_type,
          },
        },
        update: {
          ...(email_enabled !== undefined && { email_enabled }),
          ...(sms_enabled !== undefined && { sms_enabled }),
          ...(in_app_enabled !== undefined && { in_app_enabled }),
        },
        create: {
          user_id: userId,
          alert_type,
          email_enabled: email_enabled ?? true,
          sms_enabled: sms_enabled ?? false,
          in_app_enabled: in_app_enabled ?? true,
        },
      });
      updated.push(record);
    }

    return updated;
  }

  /**
   * Dispatches an alert across configured channels (Email, SMS, In-App)
   */
  async dispatchAlert({ orgId, userId, alertType, recipientEmail, recipientPhone, subject, content }) {
    const preference = await prisma.notificationPreference.findUnique({
      where: {
        user_id_alert_type: {
          user_id: userId,
          alert_type: alertType,
        },
      },
    });

    const emailEnabled = preference ? preference.email_enabled : true;
    const smsEnabled = preference ? preference.sms_enabled : false;
    const inAppEnabled = preference ? preference.in_app_enabled : true;

    const logEntries = [];

    // 1. In-App Notification
    if (inAppEnabled) {
      const log = await prisma.notificationLog.create({
        data: {
          org_id: orgId,
          user_id: userId,
          type: alertType,
          channel: 'IN_APP',
          recipient: recipientEmail || userId,
          content: `${subject}: ${content}`,
          status: 'DELIVERED',
        },
      });
      logEntries.push(log);
    }

    // 2. Email Notification
    if (emailEnabled && recipientEmail) {
      const result = await emailService.sendEmail({
        to: recipientEmail,
        subject,
        text: content,
      });

      const log = await prisma.notificationLog.create({
        data: {
          org_id: orgId,
          user_id: userId,
          type: alertType,
          channel: 'EMAIL',
          recipient: recipientEmail,
          content: `${subject}: ${content}`,
          status: result.success ? 'DELIVERED' : 'FAILED',
        },
      });
      logEntries.push(log);
    }

    // 3. SMS Notification
    if (smsEnabled && recipientPhone) {
      const result = await smsService.sendSms({
        to: recipientPhone,
        message: `${subject}: ${content}`,
      });

      const log = await prisma.notificationLog.create({
        data: {
          org_id: orgId,
          user_id: userId,
          type: alertType,
          channel: 'SMS',
          recipient: recipientPhone,
          content: `${subject}: ${content}`,
          status: result.success ? 'DELIVERED' : 'FAILED',
        },
      });
      logEntries.push(log);
    }

    return logEntries;
  }

  /**
   * Retrieves notification logs for audit and in-app notifications
   */
  async getNotificationLogs(orgId, user, limit = 50) {
    const where = { org_id: orgId };
    if (user.role !== 'ORG_ADMIN') {
      where.user_id = user.id;
    }

    return await prisma.notificationLog.findMany({
      where,
      orderBy: { sent_at: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }
}

module.exports = new NotificationService();
