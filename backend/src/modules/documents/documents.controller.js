const documentsService = require('./documents.service');
const storageService = require('../../services/StorageService');

class DocumentsController {
  /**
   * POST /api/documents/upload
   */
  async upload(req, res, next) {
    try {
      const { locationId, licenseTypeId, issueDate, expiryDate, parentDocumentId } = req.body;
      const result = await documentsService.uploadDocument({
        file: req.file,
        orgId: req.orgId,
        userId: req.user.id,
        locationId: locationId || null,
        licenseTypeId,
        issueDate,
        expiryDate,
        parentDocumentId,
      });

      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/documents/:id/verify
   */
  async verify(req, res, next) {
    try {
      const { id } = req.params;
      const { action, rejectionReason } = req.body;
      const result = await documentsService.verifyDocument(id, req.orgId, req.user.id, {
        action,
        rejectionReason,
      });

      res.status(200).json({
        success: true,
        message: `Document ${action === 'APPROVE' ? 'verified' : 'rejected'} successfully.`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/documents/:id/integrity
   */
  async verifyIntegrity(req, res, next) {
    try {
      const { id } = req.params;
      const result = await documentsService.verifyIntegrity(id, req.orgId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/documents/:id/history
   */
  async getRenewalHistory(req, res, next) {
    try {
      const { id } = req.params;
      const result = await documentsService.getRenewalHistory(id, req.orgId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/documents
   */
  async getDocuments(req, res, next) {
    try {
      const { locationId, licenseTypeId, status } = req.query;
      const result = await documentsService.getDocuments(req.orgId, req.user, {
        locationId,
        licenseTypeId,
        status,
      });
      res.status(200).json({
        success: true,
        data: result,
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
      const result = await documentsService.getDocumentById(id, req.orgId, req.user);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/documents/download/:key
   */
  async downloadFile(req, res, next) {
    try {
      const key = decodeURIComponent(req.params.key);
      const buffer = await storageService.getFileBuffer(key);
      res.setHeader('Content-Disposition', `attachment; filename="${key.split('/').pop()}"`);
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DocumentsController();
