const express = require('express');
const intelligenceController = require('./intelligence.controller');
const { authenticateJWT } = require('../../middleware/auth');
const { authorizeRoles, verifyLocationAccess } = require('../../middleware/rbac');
const { tenantScope } = require('../../middleware/tenantScope');

const router = express.Router();

// All intelligence endpoints require authentication
router.use(authenticateJWT);

// Global Graph & Rules (accessible by all authenticated users)
router.get('/graph', (req, res, next) => intelligenceController.getGlobalGraph(req, res, next));
router.get('/license-types', (req, res, next) => intelligenceController.getLicenseTypes(req, res, next));
router.get('/license-types/:id', (req, res, next) => intelligenceController.getLicenseTypeById(req, res, next));
router.get('/dependencies', (req, res, next) => intelligenceController.getDependencies(req, res, next));
router.get('/rules', (req, res, next) => intelligenceController.getRequiredRules(req, res, next));

// Location-specific dependency graph & cascading analysis (scoped to location access)
router.get(
  '/locations/:id/graph',
  tenantScope,
  verifyLocationAccess('id', 'params'),
  (req, res, next) => intelligenceController.getLocationGraph(req, res, next)
);

// Admin Configuration Routes
router.post(
  '/license-types',
  authorizeRoles('ORG_ADMIN'),
  (req, res, next) => intelligenceController.createLicenseType(req, res, next)
);

router.post(
  '/dependencies',
  authorizeRoles('ORG_ADMIN'),
  (req, res, next) => intelligenceController.createDependency(req, res, next)
);

router.delete(
  '/dependencies/:id',
  authorizeRoles('ORG_ADMIN'),
  (req, res, next) => intelligenceController.deleteDependency(req, res, next)
);

module.exports = router;
