const prisma = require('../../config/db');
const emailService = require('../../services/EmailService');
const { NotFoundError, BadRequestError } = require('../../utils/errors');

class NotificationService {
  /**
   * Helper to format content consistently (parsing JSON if available)
   */
  _formatNotification(item) {
    let title = `${item.type.replace(/_/g, ' ')}`;
    let message = item.content;
    let link = null;

    try {
      if (item.content.startsWith('{') && item.content.endsWith('}')) {
        const parsed = JSON.parse(item.content);
        title = parsed.title || title;
        message = parsed.message || parsed.content || message;
        link = parsed.link || null;
      }
    } catch (e) {
      // Content was plain text
    }

    return {
      id: item.id,
      orgId: item.org_id,
      userId: item.user_id,
      type: item.type,
      channel: item.channel,
      title,
      message,
      link,
      isRead: item.status === 'READ',
      status: item.status,
      sentAt: item.sent_at,
    };
  }

  /**
   * Creates an in-app notification record
   */
  async createInAppNotification({ userId, orgId, type, title, message, link }) {
    const payload = JSON.stringify({
      title: title || type.replace(/_/g, ' '),
      message,
      link: link || null,
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    const notification = await prisma.notificationLog.create({
      data: {
        org_id: orgId,
        user_id: userId,
        type: type || 'EXPIRY_WARNING',
        channel: 'IN_APP',
        recipient: user?.email || userId,
        content: payload,
        status: 'UNREAD',
      },
    });

    return this._formatNotification(notification);
  }

  /**
   * Dispatch notification respecting user notification preferences
   * Automatically creates IN_APP alert and sends EMAIL if enabled
   */
  async dispatchAlert({ userId, orgId, type, title, message, link, emailSubject, emailHtml }) {
    // 1. Fetch user preferences
    const pref = await prisma.notificationPreference.findUnique({
      where: {
        user_id_alert_type: {
          user_id: userId,
          alert_type: type,
        },
      },
    });

    const inAppEnabled = pref ? pref.in_app_enabled : true;
    const emailEnabled = pref ? pref.email_enabled : true;

    const results = { inApp: null, email: null };

    // 2. Create in-app notification
    if (inAppEnabled) {
      results.inApp = await this.createInAppNotification({
        userId,
        orgId,
        type,
        title,
        message,
        link,
      });
    }

    // 3. Send email if enabled
    if (emailEnabled) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (user && user.email) {
        try {
          const subject = emailSubject || `Compliance Platform Notice: ${title}`;
          const html = emailHtml || emailService.wrapTemplate({
            title,
            subtitle: `Notification for ${user.name}`,
            contentHtml: `<p>${message}</p>`,
            actionButton: link ? { text: 'View Details', url: link } : null,
          });

          results.email = await emailService.sendEmail({
            to: user.email,
            subject,
            html,
            text: `${title}\n\n${message}`,
          });

          // Log the email notification
          await prisma.notificationLog.create({
            data: {
              org_id: orgId,
              user_id: userId,
              type,
              channel: 'EMAIL',
              recipient: user.email,
              content: message,
              status: 'SENT',
            },
          });
        } catch (err) {
          console.error(`⚠️ [NotificationService] Email delivery failed for ${user.email}:`, err.message);
          results.email = { error: err.message };
        }
      }
    }

    return results;
  }

  /**
   * Get user's in-app notifications with pagination & filtering
   */
  async getUserNotifications(userId, { page = 1, limit = 20, status = null, type = null } = {}) {
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.max(1, parseInt(limit, 10));
    const take = Math.min(100, Math.max(1, parseInt(limit, 10)));

    const where = {
      user_id: userId,
      channel: 'IN_APP',
    };

    if (status) {
      where.status = status.toUpperCase();
    }

    if (type) {
      where.type = type;
    }

    const [items, total, unreadCount] = await Promise.all([
      prisma.notificationLog.findMany({
        where,
        orderBy: { sent_at: 'desc' },
        skip,
        take,
      }),
      prisma.notificationLog.count({ where }),
      prisma.notificationLog.count({
        where: {
          user_id: userId,
          channel: 'IN_APP',
          status: 'UNREAD',
        },
      }),
    ]);

    return {
      notifications: items.map(this._formatNotification),
      pagination: {
        page: parseInt(page, 10),
        limit: take,
        total,
        totalPages: Math.ceil(total / take) || 1,
      },
      unreadCount,
    };
  }

  /**
   * Fast unread notifications count for bell badge icon
   */
  async getUnreadCount(userId) {
    const count = await prisma.notificationLog.count({
      where: {
        user_id: userId,
        channel: 'IN_APP',
        status: 'UNREAD',
      },
    });

    return { unreadCount: count };
  }

  /**
   * Mark a single notification as read
   */
  async markAsRead(notificationId, userId) {
    const notification = await prisma.notificationLog.findFirst({
      where: {
        id: notificationId,
        user_id: userId,
      },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    const updated = await prisma.notificationLog.update({
      where: { id: notificationId },
      data: { status: 'READ' },
    });

    return this._formatNotification(updated);
  }

  /**
   * Mark all unread in-app notifications as read for current user
   */
  async markAllAsRead(userId) {
    const result = await prisma.notificationLog.updateMany({
      where: {
        user_id: userId,
        channel: 'IN_APP',
        status: 'UNREAD',
      },
      data: { status: 'READ' },
    });

    return { updatedCount: result.count };
  }

  /**
   * Delete an in-app notification
   */
  async deleteNotification(notificationId, userId) {
    const notification = await prisma.notificationLog.findFirst({
      where: {
        id: notificationId,
        user_id: userId,
      },
    });

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    await prisma.notificationLog.delete({
      where: { id: notificationId },
    });

    return { success: true };
  }

  /**
   * Get user's notification preferences across all alert categories and channels
   */
  async getUserPreferences(userId) {
    const prefs = await prisma.notificationPreference.findMany({
      where: { user_id: userId },
    });

    const result = {
      email_enabled: true,
      sms_enabled: false,
      in_app_enabled: true,
      expiry_warning: true,
      lapsed_license: true,
      cascading_risk: true,
    };

    if (prefs.length > 0) {
      result.email_enabled = prefs.some((p) => p.email_enabled);
      result.sms_enabled = prefs.some((p) => p.sms_enabled);
      result.in_app_enabled = prefs.some((p) => p.in_app_enabled);

      const expiryPref = prefs.find((p) => p.alert_type === 'EXPIRY_WARNING');
      const lapsedPref = prefs.find((p) => p.alert_type === 'LAPSED_LICENSE');
      const cascadingPref = prefs.find((p) => p.alert_type === 'CASCADING_RISK');

      if (expiryPref) result.expiry_warning = expiryPref.in_app_enabled || expiryPref.email_enabled;
      if (lapsedPref) result.lapsed_license = lapsedPref.in_app_enabled || lapsedPref.email_enabled;
      if (cascadingPref) result.cascading_risk = cascadingPref.in_app_enabled || cascadingPref.email_enabled;
    }

    return result;
  }

  /**
   * Save or update notification preferences for user
   */
  async updateUserPreferences(userId, prefs) {
    const alertTypes = ['EXPIRY_WARNING', 'LAPSED_LICENSE', 'CASCADING_RISK'];

    await Promise.all(
      alertTypes.map((alertType) => {
        const typeEnabled =
          alertType === 'EXPIRY_WARNING'
            ? prefs.expiry_warning !== false
            : alertType === 'LAPSED_LICENSE'
            ? prefs.lapsed_license !== false
            : alertType === 'CASCADING_RISK'
            ? prefs.cascading_risk !== false
            : true;

        const emailEnabled = Boolean(prefs.email_enabled && typeEnabled);
        const smsEnabled = Boolean(prefs.sms_enabled && typeEnabled);
        const inAppEnabled = Boolean(prefs.in_app_enabled && typeEnabled);

        return prisma.notificationPreference.upsert({
          where: {
            user_id_alert_type: {
              user_id: userId,
              alert_type: alertType,
            },
          },
          create: {
            user_id: userId,
            alert_type: alertType,
            email_enabled: emailEnabled,
            sms_enabled: smsEnabled,
            in_app_enabled: inAppEnabled,
          },
          update: {
            email_enabled: emailEnabled,
            sms_enabled: smsEnabled,
            in_app_enabled: inAppEnabled,
          },
        });
      })
    );

    return await this.getUserPreferences(userId);
  }

  /**
   * Automated / on-demand sweep for expiring licenses and lapsed compliance
   */
  async runExpirySweep(orgId = null) {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const docWhere = {
      expiry_date: { not: null },
      status: { not: 'REJECTED' },
    };
    if (orgId) docWhere.org_id = orgId;

    const docs = await prisma.document.findMany({
      where: docWhere,
      include: {
        license_type: true,
        location: true,
      },
    });

    const generatedAlerts = [];

    const orgAdmins = await prisma.user.findMany({
      where: orgId ? { org_id: orgId, role: 'ORG_ADMIN' } : { role: 'ORG_ADMIN' },
    });

    for (const doc of docs) {
      const expiry = new Date(doc.expiry_date);
      const isExpired = expiry < now;
      const isExpiringSoon = expiry >= now && expiry <= thirtyDaysFromNow;
      const daysLeft = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

      if (isExpired) {
        if (doc.status !== 'EXPIRED') {
          await prisma.document.update({
            where: { id: doc.id },
            data: { status: 'EXPIRED' },
          });
        }

        const recipients = orgAdmins.filter((u) => u.org_id === doc.org_id);
        if (doc.uploaded_by_id) {
          const uploader = await prisma.user.findUnique({ where: { id: doc.uploaded_by_id } });
          if (uploader && !recipients.some((r) => r.id === uploader.id)) recipients.push(uploader);
        }

        for (const recipient of recipients) {
          const recentLog = await prisma.notificationLog.findFirst({
            where: {
              user_id: recipient.id,
              type: 'LAPSED_LICENSE',
              content: { contains: doc.file_name },
              sent_at: { gte: new Date(Date.now() - 48 * 3600 * 1000) },
            },
          });

          if (!recentLog) {
            const locName = doc.location ? doc.location.name : 'Organization-wide';
            const alert = await this.dispatchAlert({
              userId: recipient.id,
              orgId: doc.org_id,
              type: 'LAPSED_LICENSE',
              title: `🚨 License Lapsed: ${doc.license_type?.name || doc.file_name}`,
              message: `The license '${doc.license_type?.name || doc.file_name}' for ${locName} expired on ${expiry.toLocaleDateString()}. Compliance score is affected.`,
              link: '/documents',
            });
            generatedAlerts.push(alert);
          }
        }
      } else if (isExpiringSoon) {
        const recipients = orgAdmins.filter((u) => u.org_id === doc.org_id);
        if (doc.uploaded_by_id) {
          const uploader = await prisma.user.findUnique({ where: { id: doc.uploaded_by_id } });
          if (uploader && !recipients.some((r) => r.id === uploader.id)) recipients.push(uploader);
        }

        for (const recipient of recipients) {
          const recentLog = await prisma.notificationLog.findFirst({
            where: {
              user_id: recipient.id,
              type: 'EXPIRY_WARNING',
              content: { contains: doc.file_name },
              sent_at: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
            },
          });

          if (!recentLog) {
            const locName = doc.location ? doc.location.name : 'Organization-wide';
            const alert = await this.dispatchAlert({
              userId: recipient.id,
              orgId: doc.org_id,
              type: 'EXPIRY_WARNING',
              title: `⚠️ Upcoming Expiry: ${doc.license_type?.name || doc.file_name}`,
              message: `The license '${doc.license_type?.name || doc.file_name}' for ${locName} will expire in ${daysLeft} days (${expiry.toLocaleDateString()}). Please initiate renewal.`,
              link: '/documents',
            });
            generatedAlerts.push(alert);
          }
        }
      }
    }

    return {
      documentsEvaluated: docs.length,
      alertsDispatched: generatedAlerts.length,
      generatedAlerts,
    };
  }
}

module.exports = new NotificationService();
