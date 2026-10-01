const express = require('express');
const multer = require('multer');
const documentsController = require('./documents.controller');
const { authenticateJWT } = require('../../middleware/auth');
const { tenantScope } = require('../../middleware/tenantScope');
const { authorizeRoles } = require('../../middleware/rbac');
const { BadRequestError } = require('../../utils/errors');

const router = express.Router();

// Configure Multer for memory buffer upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestError(
          'Invalid file type. Only PDF, JPEG, PNG, and WebP documents are accepted.'
        ),
        false
      );
    }
  },
});

// All document routes require authentication and tenant scoping
router.use(authenticateJWT, tenantScope);

// Listing & details
router.get('/', (req, res, next) => documentsController.getDocuments(req, res, next));
router.get('/:id', (req, res, next) => documentsController.getDocumentById(req, res, next));
router.get('/:id/history', (req, res, next) => documentsController.getDocumentHistory(req, res, next));
router.get('/:id/verify-integrity', (req, res, next) => documentsController.verifyIntegrity(req, res, next));
router.get('/:id/download-url', (req, res, next) => documentsController.getDownloadUrl(req, res, next));

// Upload (Org Admin & Location Managers)
router.post(
  '/upload',
  authorizeRoles('ORG_ADMIN', 'LOCATION_MANAGER'),
  upload.single('file'),
  (req, res, next) => documentsController.uploadDocument(req, res, next)
);

// Verify or Reject (Org Admin & Location Managers)
router.patch(
  '/:id/verify',
  authorizeRoles('ORG_ADMIN', 'LOCATION_MANAGER'),
  (req, res, next) => documentsController.verifyDocument(req, res, next)
);

// Renew (Org Admin & Location Managers)
router.post(
  '/:id/renew',
  authorizeRoles('ORG_ADMIN', 'LOCATION_MANAGER'),
  upload.single('file'),
  (req, res, next) => documentsController.renewDocument(req, res, next)
);

module.exports = router;
