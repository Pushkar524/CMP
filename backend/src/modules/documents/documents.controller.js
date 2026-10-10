const documentsService = require('./documents.service');

class DocumentsController {
  /**
   * GET /api/documents
   */
  async getDocuments(req, res, next) {
    try {
      const { locationId, licenseTypeId, status } = req.query;
      const docs = await documentsService.getDocuments(req.orgId, req.user, {
        locationId,
        licenseTypeId,
        status,
      });
      res.status(200).json({
        success: true,
        data: docs,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/documents/:id
   */
  async getDocumentById(req, res, next) {
    try {
      const { id } = req.params;
      const doc = await documentsService.getDocumentById(id, req.orgId);
      res.status(200).json({
        success: true,
        data: doc,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/documents/upload
   */
  async uploadDocument(req, res, next) {
    try {
      const doc = await documentsService.uploadDocument({
        orgId: req.orgId,
        user: req.user,
        file: req.file,
        metadata: req.body,
      });
      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully and queued for verification.',
        data: doc,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/documents/:id/verify
   */
  async verifyDocument(req, res, next) {
    try {
      const { id } = req.params;
      const { approve, rejectionReason } = req.body;
      const updated = await documentsService.verifyDocument(id, req.orgId, req.user, {
        approve,
        rejectionReason,
      });
      res.status(200).json({
        success: true,
        message: approve ? 'Document verified successfully.' : 'Document rejected.',
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/documents/:id/renew
   */
  async renewDocument(req, res, next) {
    try {
      const { id } = req.params;
      const renewed = await documentsService.renewDocument(
        id,
        req.orgId,
        req.user,
        req.file,
        req.body
      );
      res.status(201).json({
        success: true,
        message: 'Document renewed successfully with linked version history.',
        data: renewed,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/documents/:id/history
   */
  async getDocumentHistory(req, res, next) {
    try {
      const { id } = req.params;
      const history = await documentsService.getDocumentHistory(id, req.orgId);
      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/documents/:id/verify-integrity
   */
  async verifyIntegrity(req, res, next) {
    try {
      const { id } = req.params;
      const integrity = await documentsService.verifyIntegrity(id, req.orgId);
      res.status(200).json({
        success: true,
        data: integrity,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/documents/:id/download-url
   */
  async getDownloadUrl(req, res, next) {
    try {
      const { id } = req.params;
      const result = await documentsService.getDownloadUrl(id, req.orgId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DocumentsController();
