const prisma = require('../../config/db');
const storageService = require('../../services/StorageService');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../../utils/errors');
const crypto = require('crypto');
const notificationService = require('../notifications/notification.service');

class DocumentService {
  /**
   * List documents visible to the requesting user.
   * ORG_ADMIN → all org documents
   * LOCATION_MANAGER → only documents for their assigned locations
   */
  async getDocuments(user, query = {}) {
    const where = { org_id: user.org_id };

    if (user.role === 'LOCATION_MANAGER') {
      where.OR = [
        { location_id: null },
        { location_id: { in: user.accessibleLocationIds } },
      ];
    }

    if (query.location_id) {
      where.location_id = query.location_id;
    }
    if (query.status) {
      where.status = query.status;
    }

    const page = query.page ? Math.max(1, parseInt(query.page, 10)) : null;
    const limit = query.limit ? Math.max(1, parseInt(query.limit, 10)) : null;

    const findOptions = {
      where,
      include: {
        license_type: { select: { id: true, name: true, code: true } },
        location: { select: { id: true, name: true, code: true } },
        uploaded_by: { select: { id: true, name: true, email: true } },
        verified_by: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    };

    if (page && limit) {
      findOptions.skip = (page - 1) * limit;
      findOptions.take = limit;
      const [docs, total] = await Promise.all([
        prisma.document.findMany(findOptions),
        prisma.document.count({ where }),
      ]);
      return {
        documents: docs,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    const docs = await prisma.document.findMany(findOptions);
    return docs;
  }

  /**
   * Upload a new document (multipart/form-data handled by multer in controller).
   */
  async uploadDocument(user, fields, file) {
    let { license_type_id, custom_license_name, custom_issuing_authority, location_id, version, issue_date, expiry_date, parent_document_id } = fields;

    if (!file) throw new BadRequestError('No file uploaded.');

    // Support for custom / other document upload
    if (license_type_id === '__other__' || license_type_id === 'OTHER' || (!license_type_id && custom_license_name)) {
      if (!custom_license_name || !custom_license_name.trim()) {
        throw new BadRequestError('Document name is required when specifying a custom document.');
      }
      const trimmedName = custom_license_name.trim();
      const authority = (custom_issuing_authority || '').trim() || 'Custom Authority';

      // Check if a LicenseType with this name already exists
      let existingLt = await prisma.licenseType.findFirst({
        where: {
          name: { equals: trimmedName, mode: 'insensitive' },
        },
      });

      if (!existingLt) {
        const cleanBase = trimmedName.toUpperCase().replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_').slice(0, 15);
        const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
        const code = 'CUSTOM_' + (cleanBase || 'DOC') + '_' + randomSuffix;

        existingLt = await prisma.licenseType.create({
          data: {
            name: trimmedName,
            code,
            description: 'Custom regulatory document added during upload',
            issuing_authority: authority,
            is_lifetime_valid: fields.is_lifetime_valid === 'true' || fields.is_lifetime_valid === true,
          },
        });
      }

      license_type_id = existingLt.id;
    }

    if (!license_type_id) throw new BadRequestError('license_type_id is required.');

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
        license_type: { select: { id: true, name: true, code: true, issuing_authority: true } },
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

    if (doc.uploaded_by_id) {
      try {
        await notificationService.createInAppNotification({
          userId: doc.uploaded_by_id,
          orgId: user.org_id,
          type: approve ? 'EXPIRY_WARNING' : 'LAPSED_LICENSE',
          title: approve ? `✅ Document Verified: ${doc.file_name}` : `❌ Document Rejected: ${doc.file_name}`,
          message: approve
            ? `Your uploaded document "${doc.file_name}" has been approved and verified by an administrator.`
            : `Your uploaded document "${doc.file_name}" was rejected. Reason: ${reason || 'Rejected by administrator.'}`,
          link: '/documents',
        });
      } catch (notifErr) {
        console.warn('⚠️ [DocumentService] Failed to notify uploader:', notifErr.message);
      }
    }

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
