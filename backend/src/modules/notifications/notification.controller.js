const notificationService = require('./notification.service');

class NotificationController {
  /**
   * GET /api/notifications
   * List paginated notifications for current user
   */
  async getNotifications(req, res, next) {
    try {
      const { page, limit, status, type } = req.query;
      const data = await notificationService.getUserNotifications(req.user.id, {
        page,
        limit,
        status,
        type,
      });

      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/notifications/unread-count
   * Fast count of unread notifications for badge
   */
  async getUnreadCount(req, res, next) {
    try {
      const data = await notificationService.getUnreadCount(req.user.id);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/notifications/:id/read
   * Mark a single notification as read
   */
  async markAsRead(req, res, next) {
    try {
      const notification = await notificationService.markAsRead(req.params.id, req.user.id);
      res.status(200).json({
        success: true,
        message: 'Notification marked as read',
        data: notification,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/notifications/read-all
   * Mark all unread notifications as read
   */
  async markAllAsRead(req, res, next) {
    try {
      const result = await notificationService.markAllAsRead(req.user.id);
      res.status(200).json({
        success: true,
        message: 'All notifications marked as read',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/notifications/:id
   * Delete a notification
   */
  async deleteNotification(req, res, next) {
    try {
      await notificationService.deleteNotification(req.params.id, req.user.id);
      res.status(200).json({
        success: true,
        message: 'Notification deleted successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/notifications/test
   * Create a test notification for the logged-in user
   */
  async createTestAlert(req, res, next) {
    try {
      const { title, message, type, link, sendEmail = false } = req.body;
      const alertType = type || 'EXPIRY_WARNING';

      let result;
      if (sendEmail) {
        result = await notificationService.dispatchAlert({
          userId: req.user.id,
          orgId: req.user.org_id,
          type: alertType,
          title: title || 'Test Compliance Notification',
          message: message || 'This is a test notification generated via the SCLIP notification engine.',
          link: link || '/dashboard',
        });
      } else {
        result = await notificationService.createInAppNotification({
          userId: req.user.id,
          orgId: req.user.org_id,
          type: alertType,
          title: title || 'Test In-App Notification',
          message: message || 'This is a test in-app notification.',
          link: link || '/dashboard',
        });
      }

      res.status(201).json({
        success: true,
        message: 'Notification generated successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new NotificationController();
