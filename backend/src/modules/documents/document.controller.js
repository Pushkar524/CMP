const documentService = require('./document.service');
const multer = require('multer');

// Use memory storage so we can access file.buffer for hashing + streaming to MinIO
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

class DocumentController {
  /**
   * GET /api/documents
   * Returns all documents visible to the current user
   */
  async getDocuments(req, res, next) {
    try {
      const docs = await documentService.getDocuments(req.user);
      res.status(200).json({ success: true, documents: docs });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/documents  (multipart/form-data)
   * Upload a new compliance document
   */
  async uploadDocument(req, res, next) {
    try {
      const doc = await documentService.uploadDocument(req.user, req.body, req.file);
      res.status(201).json({ success: true, message: 'Document uploaded successfully.', document: doc });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/documents/:id/verify
   * Verify or reject a document (ORG_ADMIN only)
   */
  async verifyDocument(req, res, next) {
    try {
      const { approve, reason } = req.body;
      const doc = await documentService.verifyDocument(req.user, req.params.id, approve, reason);
      res.status(200).json({ success: true, message: approve ? 'Document verified.' : 'Document rejected.', document: doc });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/documents/:id/download
   * Get a presigned download URL
   */
  async getDownloadUrl(req, res, next) {
    try {
      const result = await documentService.getDownloadUrl(req.user, req.params.id);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/documents/:id/file
   * View/stream document file directly (inline for preview/thumbnail)
   */
  async getDocumentFile(req, res, next) {
    try {
      const result = await documentService.getDocumentFile(req.user, req.params.id);
      if (result.stream) {
        res.setHeader('Content-Type', result.mime_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `inline; filename="${result.file_name}"`);
        result.stream.pipe(res);
      } else if (result.url) {
        res.redirect(result.url);
      } else {
        res.status(404).json({ message: 'File not available.' });
      }
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/documents/:id
   * Delete a document
   */
  async deleteDocument(req, res, next) {
    try {
      const result = await documentService.deleteDocument(req.user, req.params.id);
      res.status(200).json({ success: true, ...result });
    } catch (err) {
      next(err);
    }
  }
}

const controller = new DocumentController();
module.exports = { controller, upload };
