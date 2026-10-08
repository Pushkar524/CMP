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
          const subject = emailSubject || `SCLIP Notice: ${title}`;
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
}

module.exports = new NotificationService();
