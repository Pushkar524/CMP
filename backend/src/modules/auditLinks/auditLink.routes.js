const express = require('express');
const auditLinkController = require('./auditLink.controller');
const { authenticateJWT } = require('../../middleware/auth');
const { tenantScope } = require('../../middleware/tenantScope');
const { authorizeRoles } = require('../../middleware/rbac');

const router = express.Router();

// ── PUBLIC routes (no auth) ─────────────────────────────────────
// Get audit data room by token (external inspector view)
router.get('/by-token/:token', (req, res, next) => auditLinkController.getAuditByToken(req, res, next));

// Record access log (called on successful data room open)
router.post('/access/:token', (req, res, next) => auditLinkController.recordAuditAccess(req, res, next));

// ── Protected routes ────────────────────────────────────────────
router.use(authenticateJWT, tenantScope);

// List all audit links for the org
router.get('/', (req, res, next) => auditLinkController.getAuditLinks(req, res, next));

// Create a new audit link (ORG_ADMIN only)
router.post('/', authorizeRoles('ORG_ADMIN'), (req, res, next) => auditLinkController.createAuditLink(req, res, next));

// Revoke an audit link (ORG_ADMIN only)
router.patch('/:id', authorizeRoles('ORG_ADMIN'), (req, res, next) => auditLinkController.revokeAuditLink(req, res, next));

module.exports = router;
