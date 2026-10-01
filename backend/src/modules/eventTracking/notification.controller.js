const notificationService = require('./notification.service');

class NotificationController {
  /**
   * GET /api/notifications/preferences
   */
  async getPreferences(req, res, next) {
    try {
      const prefs = await notificationService.getPreferences(req.user.id);
      res.status(200).json({
        success: true,
        data: prefs,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/notifications/preferences
   */
  async updatePreference(req, res, next) {
    try {
      const updated = await notificationService.updatePreference(req.user.id, req.body);
      res.status(200).json({
        success: true,
        message: 'Notification preferences updated.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/notifications/logs
   */
  async getLogs(req, res, next) {
    try {
      const logs = await notificationService.getLogs(req.orgId, req.user.id, req.user.role);
      res.status(200).json({
        success: true,
        data: logs,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new NotificationController();
