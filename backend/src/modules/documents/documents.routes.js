const express = require('express');
const multer = require('multer');
const documentsController = require('./documents.controller');
const { authenticateJWT } = require('../../middleware/auth');
const { tenantScope } = require('../../middleware/tenantScope');
const { authorizeRoles, verifyLocationAccess } = require('../../middleware/rbac');

// Configure Multer with in-memory storage (20MB limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const router = express.Router();

// Public / Presigned file download stream route
router.get('/download/:key', (req, res, next) =>
  documentsController.downloadFile(req, res, next)
);

// All other document routes require authentication and tenant isolation
router.use(authenticateJWT, tenantScope);

// Document Upload (Managers and Admins)
router.post(
  '/upload',
  upload.single('file'),
  verifyLocationAccess('locationId', 'body'),
  (req, res, next) => documentsController.upload(req, res, next)
);

// Document Verification Workflow (Admins and Managers)
router.patch(
  '/:id/verify',
  authorizeRoles('ORG_ADMIN', 'LOCATION_MANAGER'),
  (req, res, next) => documentsController.verify(req, res, next)
);

// Cryptographic SHA-256 Integrity Verification
router.get('/:id/integrity', (req, res, next) =>
  documentsController.verifyIntegrity(req, res, next)
);

// Renewal Version Chain History
router.get('/:id/history', (req, res, next) =>
  documentsController.getRenewalHistory(req, res, next)
);

// List & Filter Documents
router.get('/', (req, res, next) =>
  documentsController.getDocuments(req, res, next)
);

// Document Details
router.get('/:id', (req, res, next) =>
  documentsController.getDocumentById(req, res, next)
);

module.exports = router;
