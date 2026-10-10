const express = require('express');
const { controller, upload } = require('./document.controller');
const { authenticateJWT } = require('../../middleware/auth');
const { tenantScope } = require('../../middleware/tenantScope');
const { authorizeRoles, verifyLocationAccess } = require('../../middleware/rbac');

const router = express.Router();

// All document routes require authentication + org scope
router.use(authenticateJWT, tenantScope);

// List documents (filtered by role in service)
router.get('/', (req, res, next) => controller.getDocuments(req, res, next));

// Upload a new document (multipart) — location manager only for their own locations
router.post(
  '/',
  upload.single('file'),
  verifyLocationAccess('location_id', 'body'),
  (req, res, next) => controller.uploadDocument(req, res, next)
);

// Verify or reject a document (ORG_ADMIN only)
router.patch(
  '/:id/verify',
  authorizeRoles('ORG_ADMIN'),
  (req, res, next) => controller.verifyDocument(req, res, next)
);

// Get presigned download URL for a document
router.get('/:id/download', (req, res, next) => controller.getDownloadUrl(req, res, next));

module.exports = router;
