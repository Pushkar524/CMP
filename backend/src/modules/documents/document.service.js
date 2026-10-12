const prisma = require('../../config/db');
const storageService = require('../../services/StorageService');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../../utils/errors');
const crypto = require('crypto');

class DocumentService {
  /**
   * List documents visible to the requesting user.
   * ORG_ADMIN → all org documents
   * LOCATION_MANAGER → only documents for their assigned locations
   */
  async getDocuments(user) {
    const where = { org_id: user.org_id };

    if (user.role === 'LOCATION_MANAGER') {
      where.OR = [
        { location_id: null },
        { location_id: { in: user.accessibleLocationIds } },
      ];
    }

    const docs = await prisma.document.findMany({
      where,
      include: {
        license_type: { select: { id: true, name: true, code: true } },
        location: { select: { id: true, name: true, code: true } },
        uploaded_by: { select: { id: true, name: true, email: true } },
        verified_by: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return docs;
  }

  /**
   * Upload a new document (multipart/form-data handled by multer in controller).
   */
  async uploadDocument(user, fields, file) {
    const { license_type_id, location_id, version, issue_date, expiry_date, parent_document_id } = fields;

    if (!license_type_id) throw new BadRequestError('license_type_id is required.');
    if (!file) throw new BadRequestError('No file uploaded.');

    // Location access check for LOCATION_MANAGER
    if (location_id && user.role === 'LOCATION_MANAGER') {
      if (!user.accessibleLocationIds.includes(location_id)) {
        throw new ForbiddenError('You do not have access to this location.');
      }
    }

    // Compute SHA256 hash of file buffer
    const sha256Hash = crypto.createHash('sha256').update(file.buffer).digest('hex');

    // Upload to storage (MinIO/S3)
    const safeFileName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `documents/${user.org_id}/${crypto.randomUUID()}-${safeFileName}`;
    await storageService.uploadFile(file.buffer, file.mimetype, storageKey);

    const parsedIssueDate = issue_date ? new Date(issue_date) : null;
    const parsedExpiryDate = expiry_date ? new Date(expiry_date) : null;

    const doc = await prisma.document.create({
      data: {
        org_id: user.org_id,
        location_id: location_id || null,
        license_type_id,
        file_name: file.originalname,
        storage_key: storageKey,
        file_size: file.size,
        mime_type: file.mimetype,
        sha256_hash: sha256Hash,
        issue_date: parsedIssueDate && !isNaN(parsedIssueDate) ? parsedIssueDate : null,
        expiry_date: parsedExpiryDate && !isNaN(parsedExpiryDate) ? parsedExpiryDate : null,
        parent_document_id: parent_document_id || null,
        uploaded_by_id: user.id,
        status: 'PENDING_VERIFICATION',
      },
      include: {
        license_type: { select: { id: true, name: true, code: true } },
        location: { select: { id: true, name: true } },
      },
    });

    return doc;
  }

  /**
   * Verify or reject a document (ORG_ADMIN only).
   */
  async verifyDocument(user, docId, approve, reason) {
    const doc = await prisma.document.findFirst({
      where: { id: docId, org_id: user.org_id },
    });

    if (!doc) throw new NotFoundError('Document not found.');

    const updated = await prisma.document.update({
      where: { id: docId },
      data: {
        status: approve ? 'VERIFIED' : 'REJECTED',
        rejection_reason: approve ? null : (reason || 'Rejected by admin.'),
        verified_by_id: user.id,
        verified_at: new Date(),
      },
    });

    return updated;
  }

  /**
   * Get a signed download URL for a document.
   */
  async getDownloadUrl(user, docId) {
    const doc = await prisma.document.findFirst({
      where: { id: docId, org_id: user.org_id },
    });
    if (!doc) throw new NotFoundError('Document not found.');

    const url = await storageService.getSignedDownloadUrl(doc.storage_key);
    return { url, file_name: doc.file_name };
  }

  /**
   * Stream document or provide signed URL for thumbnails and inline previews.
   */
  async getDocumentFile(user, docId) {
    const doc = await prisma.document.findFirst({
      where: { id: docId, org_id: user.org_id },
    });
    if (!doc) throw new NotFoundError('Document not found.');

    try {
      const stream = await storageService.getFileStream(doc.storage_key);
      return {
        stream,
        mime_type: doc.mime_type,
        file_name: doc.file_name,
      };
    } catch (err) {
      const url = await storageService.getSignedDownloadUrl(doc.storage_key);
      return {
        url,
        mime_type: doc.mime_type,
        file_name: doc.file_name,
      };
    }
  }

  /**
   * Delete a document and its storage object.
   */
  async deleteDocument(user, docId) {
    const doc = await prisma.document.findFirst({
      where: { id: docId, org_id: user.org_id },
    });
    if (!doc) throw new NotFoundError('Document not found.');

    if (user.role !== 'ORG_ADMIN') {
      if (doc.uploaded_by_id !== user.id && (!doc.location_id || !user.accessibleLocationIds?.includes(doc.location_id))) {
        throw new ForbiddenError('You do not have permission to delete this document.');
      }
    }

    // Unlink any child renewals referencing this document as parent
    await prisma.document.updateMany({
      where: { parent_document_id: docId },
      data: { parent_document_id: null },
    });

    // Delete record from database (audit_link_documents cascades automatically)
    await prisma.document.delete({
      where: { id: docId },
    });

    // Clean up file in storage service
    if (doc.storage_key) {
      try {
        await storageService.deleteFile(doc.storage_key);
      } catch (err) {
        console.warn(`[DocumentService] Failed to delete storage object ${doc.storage_key}:`, err.message);
      }
    }

    return { message: 'Document deleted successfully.', id: docId };
  }
}

module.exports = new DocumentService();
