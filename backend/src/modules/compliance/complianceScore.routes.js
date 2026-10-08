const express = require('express');
const complianceScoreController = require('./complianceScore.controller');
const { authenticateJWT } = require('../../middleware/auth');
const { tenantScope } = require('../../middleware/tenantScope');

const router = express.Router();

// All routes require authentication & tenant scoping
router.use(authenticateJWT);
router.use(tenantScope);

// Organization roll-up score overview
router.get('/organization/overview', (req, res, next) =>
  complianceScoreController.getOrganizationOverview(req, res, next)
);

// Location latest compliance score & breakdown
router.get('/locations/:id', (req, res, next) =>
  complianceScoreController.getLocationScore(req, res, next)
);

// Recalculate compliance score for a location
router.post('/locations/:id/recalculate', (req, res, next) =>
  complianceScoreController.recalculateLocationScore(req, res, next)
);

// Historical score timeline for a location (for charts)
router.get('/locations/:id/history', (req, res, next) =>
  complianceScoreController.getLocationHistory(req, res, next)
);

module.exports = router;
