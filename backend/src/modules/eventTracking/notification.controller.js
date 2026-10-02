const notificationService = require('./notification.service');
const { runExpirySweep } = require('./jobs/expiryScheduler.job');
const { runComplianceScoreSnapshotJob } = require('./jobs/complianceScore.job');

class NotificationController {
  /**
   * GET /api/notifications/preferences
   */
  async getPreferences(req, res, next) {
    try {
      const result = await notificationService.getUserPreferences(req.user.id);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/notifications/preferences
   */
  async updatePreferences(req, res, next) {
    try {
      const { preferences } = req.body;
      const result = await notificationService.updatePreferences(req.user.id, preferences);
      res.status(200).json({
        success: true,
        message: 'Notification preferences updated successfully.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/notifications/logs
   */
  async getNotificationLogs(req, res, next) {
    try {
      const limit = parseInt(req.query.limit, 10) || 50;
      const result = await notificationService.getNotificationLogs(req.orgId, req.user, limit);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/notifications/trigger-expiry-sweep
   */
  async triggerExpirySweep(req, res, next) {
    try {
      const result = await runExpirySweep();
      res.status(200).json({
        success: true,
        message: 'Expiry and cascading risk sweep executed.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/notifications/trigger-score-snapshots
   */
  async triggerScoreSnapshots(req, res, next) {
    try {
      const result = await runComplianceScoreSnapshotJob();
      res.status(200).json({
        success: true,
        message: 'Compliance score snapshot job executed.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new NotificationController();
