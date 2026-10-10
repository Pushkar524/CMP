const prisma = require('../../config/db');

class NotificationService {
  /**
   * Retrieves notification preferences for a user
   */
  async getPreferences(userId) {
    const preferences = await prisma.notificationPreference.findMany({
      where: { user_id: userId },
    });

    // If none exist yet, seed defaults for this user
    if (preferences.length === 0) {
      const alertTypes = ['EXPIRY_WARNING', 'LAPSED_LICENSE', 'CASCADING_RISK'];
      const created = [];
      for (const alertType of alertTypes) {
        const pref = await prisma.notificationPreference.create({
          data: {
            user_id: userId,
            alert_type: alertType,
            email_enabled: true,
            sms_enabled: false,
            in_app_enabled: true,
          },
        });
        created.push(pref);
      }
      return created;
    }

    return preferences;
  }

  /**
   * Updates notification preferences for an alert type
   */
  async updatePreference(userId, { alertType, emailEnabled, smsEnabled, inAppEnabled }) {
    return await prisma.notificationPreference.upsert({
      where: {
        user_id_alert_type: {
          user_id: userId,
          alert_type: alertType,
        },
      },
      update: {
        ...(emailEnabled !== undefined && { email_enabled: emailEnabled }),
        ...(smsEnabled !== undefined && { sms_enabled: smsEnabled }),
        ...(inAppEnabled !== undefined && { in_app_enabled: inAppEnabled }),
      },
      create: {
        user_id: userId,
        alert_type: alertType,
        email_enabled: emailEnabled ?? true,
        sms_enabled: smsEnabled ?? false,
        in_app_enabled: inAppEnabled ?? true,
      },
    });
  }

  /**
   * Retrieves notification logs (in-app alerts and delivery history)
   */
  async getLogs(orgId, userId, role) {
    const where = { org_id: orgId };
    if (role !== 'ORG_ADMIN') {
      where.user_id = userId;
    }

    return await prisma.notificationLog.findMany({
      where,
      orderBy: { sent_at: 'desc' },
      take: 50,
    });
  }

  /**
   * Logs a dispatched notification
   */
  async logNotification({ orgId, userId, type, channel, recipient, content, status = 'SENT' }) {
    return await prisma.notificationLog.create({
      data: {
        org_id: orgId,
        user_id: userId,
        type,
        channel,
        recipient,
        content,
        status,
      },
    });
  }
}

module.exports = new NotificationService();
