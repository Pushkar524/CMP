const express = require('express');
const tenancyController = require('./tenancy.controller');
const { authenticateJWT } = require('../../middleware/auth');
const { tenantScope } = require('../../middleware/tenantScope');
const { authorizeRoles } = require('../../middleware/rbac');

const router = express.Router();

// All tenancy routes require authentication and tenant scoping
router.use(authenticateJWT, tenantScope);

// Organization Details (Admins and Managers)
router.get('/organization', (req, res, next) =>
  tenancyController.getOrganization(req, res, next)
);

// Locations (Admins see all; Managers see assigned)
router.get('/locations', (req, res, next) =>
  tenancyController.getLocations(req, res, next)
);

// Location Management (Org Admin only)
router.post('/locations', authorizeRoles('ORG_ADMIN'), (req, res, next) =>
  tenancyController.createLocation(req, res, next)
);

// User Management (Org Admin only)
router.get('/users', authorizeRoles('ORG_ADMIN'), (req, res, next) =>
  tenancyController.getUsers(req, res, next)
);

router.post('/users', authorizeRoles('ORG_ADMIN'), (req, res, next) =>
  tenancyController.createUser(req, res, next)
);

router.post('/assign-location', authorizeRoles('ORG_ADMIN'), (req, res, next) =>
  tenancyController.assignLocationAccess(req, res, next)
);

module.exports = router;
