const express = require('express');
const intelligenceController = require('./intelligence.controller');
const { authenticateJWT } = require('../../middleware/auth');
const { tenantScope } = require('../../middleware/tenantScope');
const { verifyLocationAccess } = require('../../middleware/rbac');

const router = express.Router();

// All intelligence endpoints require authentication and tenant scoping
router.use(authenticateJWT, tenantScope);

// Regulatory metadata (all authenticated users)
router.get('/license-types', (req, res, next) =>
  intelligenceController.getLicenseTypes(req, res, next)
);
router.get('/dependencies', (req, res, next) =>
  intelligenceController.getDependencies(req, res, next)
);
router.get('/required-rules', (req, res, next) =>
  intelligenceController.getRequiredRules(req, res, next)
);

// Organization-level score rollup
router.get('/compliance-score/organization', (req, res, next) =>
  intelligenceController.getOrganizationScore(req, res, next)
);

// Location-specific scores & trends (scoped to user's assigned locations)
router.get(
  '/compliance-score/location/:id',
  verifyLocationAccess('id', 'params'),
  (req, res, next) => intelligenceController.getLocationScore(req, res, next)
);

router.get(
  '/compliance-score/history/:locationId',
  verifyLocationAccess('locationId', 'params'),
  (req, res, next) => intelligenceController.getScoreHistory(req, res, next)
);

module.exports = router;
