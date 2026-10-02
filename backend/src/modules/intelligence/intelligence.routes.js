const express = require('express');
const intelligenceController = require('./intelligence.controller');
const { authenticateJWT } = require('../../middleware/auth');
const { tenantScope } = require('../../middleware/tenantScope');
const { authorizeRoles, verifyLocationAccess } = require('../../middleware/rbac');

const router = express.Router();

router.use(authenticateJWT, tenantScope);

// Regulatory License Types
router.get('/license-types', (req, res, next) =>
  intelligenceController.getLicenseTypes(req, res, next)
);
router.post('/license-types', authorizeRoles('ORG_ADMIN'), (req, res, next) =>
  intelligenceController.createLicenseType(req, res, next)
);

// Dependency Graph Management
router.get('/dependencies', (req, res, next) =>
  intelligenceController.getDependencies(req, res, next)
);
router.post('/dependencies', authorizeRoles('ORG_ADMIN'), (req, res, next) =>
  intelligenceController.createDependency(req, res, next)
);

// Mandatory Rules Configuration
router.get('/required-licenses', (req, res, next) =>
  intelligenceController.getRequiredLicenseTypes(req, res, next)
);
router.post('/required-licenses', authorizeRoles('ORG_ADMIN'), (req, res, next) =>
  intelligenceController.createRequiredLicenseType(req, res, next)
);

// Compliance Score Calculations & Breakdowns
router.get(
  '/score/location/:locationId',
  verifyLocationAccess('locationId', 'params'),
  (req, res, next) => intelligenceController.getLocationScore(req, res, next)
);

router.post(
  '/score/location/:locationId/recalculate',
  verifyLocationAccess('locationId', 'params'),
  (req, res, next) => intelligenceController.recalculateLocationScore(req, res, next)
);

router.get('/score/organization', (req, res, next) =>
  intelligenceController.getOrganizationScoreSummary(req, res, next)
);

router.get(
  '/score/location/:locationId/history',
  verifyLocationAccess('locationId', 'params'),
  (req, res, next) => intelligenceController.getLocationScoreHistory(req, res, next)
);

module.exports = router;
