const express = require('express');
const dataRoomsController = require('./dataRooms.controller');
const { authenticateJWT } = require('../../middleware/auth');
const { tenantScope } = require('../../middleware/tenantScope');
const { authorizeRoles } = require('../../middleware/rbac');

const router = express.Router();

// ----------------------------------------------------
// Public Endpoints (for External Inspectors without login)
// ----------------------------------------------------
router.get('/public/:token', (req, res, next) =>
  dataRoomsController.getPublicAuditRoomMeta(req, res, next)
);

router.post('/public/:token/access', (req, res, next) =>
  dataRoomsController.accessPublicAuditRoom(req, res, next)
);

// ----------------------------------------------------
// Authenticated Protected Endpoints (Org Admins & Location Managers)
// ----------------------------------------------------
router.use(authenticateJWT, tenantScope);

router.get('/audit-links', (req, res, next) =>
  dataRoomsController.getAuditLinks(req, res, next)
);

router.post(
  '/audit-links',
  authorizeRoles('ORG_ADMIN', 'LOCATION_MANAGER'),
  (req, res, next) => dataRoomsController.createAuditLink(req, res, next)
);

router.get('/audit-links/:id', (req, res, next) =>
  dataRoomsController.getAuditLinkById(req, res, next)
);

router.patch(
  '/audit-links/:id/revoke',
  authorizeRoles('ORG_ADMIN', 'LOCATION_MANAGER'),
  (req, res, next) => dataRoomsController.revokeAuditLink(req, res, next)
);

module.exports = router;
