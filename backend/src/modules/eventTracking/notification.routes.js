const express = require('express');
const notificationController = require('./notification.controller');
const { authenticateJWT } = require('../../middleware/auth');
const { tenantScope } = require('../../middleware/tenantScope');
const { authorizeRoles } = require('../../middleware/rbac');

const router = express.Router();

router.use(authenticateJWT, tenantScope);

// Per-User Notification Preferences
router.get('/preferences', (req, res, next) =>
  notificationController.getPreferences(req, res, next)
);
router.patch('/preferences', (req, res, next) =>
  notificationController.updatePreferences(req, res, next)
);

// Sent Notification Logs / In-App Notifications
router.get('/logs', (req, res, next) =>
  notificationController.getNotificationLogs(req, res, next)
);

// Manual Job Trigger Routes (Org Admin only)
router.post(
  '/trigger-expiry-sweep',
  authorizeRoles('ORG_ADMIN'),
  (req, res, next) => notificationController.triggerExpirySweep(req, res, next)
);

router.post(
  '/trigger-score-snapshots',
  authorizeRoles('ORG_ADMIN'),
  (req, res, next) => notificationController.triggerScoreSnapshots(req, res, next)
);

module.exports = router;
