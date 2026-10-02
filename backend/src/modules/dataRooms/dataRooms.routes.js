const express = require('express');
const dataRoomsController = require('./dataRooms.controller');
const { authenticateJWT } = require('../../middleware/auth');
const { tenantScope } = require('../../middleware/tenantScope');
const { authorizeRoles } = require('../../middleware/rbac');

const router = express.Router();

// ---------------------------------------------------------
// 1. Authenticated Internal Management Routes (/api/data-rooms)
// ---------------------------------------------------------
router.post(
  '/audit-links',
  authenticateJWT,
  tenantScope,
  authorizeRoles('ORG_ADMIN', 'LOCATION_MANAGER'),
  (req, res, next) => dataRoomsController.createAuditLink(req, res, next)
);

router.get(
  '/audit-links',
  authenticateJWT,
  tenantScope,
  (req, res, next) => dataRoomsController.getAuditLinks(req, res, next)
);

router.delete(
  '/audit-links/:id',
  authenticateJWT,
  tenantScope,
  authorizeRoles('ORG_ADMIN', 'LOCATION_MANAGER'),
  (req, res, next) => dataRoomsController.revokeAuditLink(req, res, next)
);

router.get(
  '/audit-links/:id/logs',
  authenticateJWT,
  tenantScope,
  authorizeRoles('ORG_ADMIN'),
  (req, res, next) => dataRoomsController.getAuditLinkLogs(req, res, next)
);

module.exports = router;
