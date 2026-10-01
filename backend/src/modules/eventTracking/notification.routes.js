const express = require('express');
const notificationController = require('./notification.controller');
const { authenticateJWT } = require('../../middleware/auth');
const { tenantScope } = require('../../middleware/tenantScope');

const router = express.Router();

router.use(authenticateJWT, tenantScope);

router.get('/preferences', (req, res, next) =>
  notificationController.getPreferences(req, res, next)
);

router.patch('/preferences', (req, res, next) =>
  notificationController.updatePreference(req, res, next)
);

router.get('/logs', (req, res, next) =>
  notificationController.getLogs(req, res, next)
);

module.exports = router;
