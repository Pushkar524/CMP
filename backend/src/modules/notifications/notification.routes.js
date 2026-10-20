const express = require('express');
const notificationController = require('./notification.controller');
const { authenticateJWT } = require('../../middleware/auth');

const router = express.Router();

// All notification routes require user authentication
router.use(authenticateJWT);

// List notifications (supports ?page=1&limit=20&status=UNREAD)
router.get('/', (req, res, next) => notificationController.getNotifications(req, res, next));

// Quick unread count for UI notification badges
router.get('/unread-count', (req, res, next) => notificationController.getUnreadCount(req, res, next));

// Mark all notifications as read
router.patch('/read-all', (req, res, next) => notificationController.markAllAsRead(req, res, next));

// Mark a single notification as read
router.patch('/:id/read', (req, res, next) => notificationController.markAsRead(req, res, next));

// Delete a notification
router.delete('/:id', (req, res, next) => notificationController.deleteNotification(req, res, next));

// Trigger a test alert (useful for UI/testing)
router.post('/test', (req, res, next) => notificationController.createTestAlert(req, res, next));

// User Notification Preferences
router.get('/preferences', (req, res, next) => notificationController.getPreferences(req, res, next));
router.put('/preferences', (req, res, next) => notificationController.updatePreferences(req, res, next));

// On-demand / Triggered Expiry & Risk Sweep
router.post('/sweep', (req, res, next) => notificationController.runSweep(req, res, next));

module.exports = router;
