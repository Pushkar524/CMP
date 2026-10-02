const prisma = require('../../config/db');
const storageService = require('../../services/StorageService');
const intelligenceService = require('../intelligence/intelligence.service');
const { computeSha256 } = require('../../utils/hash');
const {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} = require('../../utils/errors');

class DocumentsService {
  /**
   * Uploads and registers a new license certificate document
   */
  async uploadDocument({
    file,
    orgId,
    userId,
    locationId,
    licenseTypeId,
    issueDate,
    expiryDate,
    parentDocumentId,
  }) {
    if (!file) {
      throw new BadRequestError('File is required for document upload.');
    }
    if (!licenseTypeId) {
      throw new BadRequestError('licenseTypeId is required.');
    }

    // Verify license type exists
    const licenseType = await prisma.licenseType.findUnique({
      where: { id: licenseTypeId },
    });
    if (!licenseType) {
      throw new NotFoundError('License type not found.');
    }

    // Verify location belongs to organization if provided
    if (locationId) {
      const location = await prisma.location.findFirst({
        where: { id: locationId, org_id: orgId },
      });
      if (!location) {
        throw new NotFoundError('Location not found in your organization.');
      }
    }

    // Verify parent document if this is a renewal
    if (parentDocumentId) {
      const parentDoc = await prisma.document.findFirst({
        where: { id: parentDocumentId, org_id: orgId },
      });
      if (!parentDoc) {
        throw new NotFoundError('Parent renewal document not found in your organization.');
      }
    }

    // 1. Compute SHA-256 Cryptographic Hash of the file buffer
    const sha256Hash = computeSha256(file.buffer);

    // 2. Generate Unique Object Storage Key
    const safeFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageKey = `org-${orgId}/loc-${locationId || 'org-wide'}/lt-${licenseType.code}/${Date.now()}-${safeFileName}`;

    // 3. Upload File to Storage Provider (with local filesystem fallback)
    await storageService.uploadFile(file.buffer, file.mimetype, storageKey);

    // 4. Create Document Record in Database
    const document = await prisma.document.create({
      data: {
        org_id: orgId,
        location_id: locationId || null,
        license_type_id: licenseTypeId,
        file_name: file.originalname,
        storage_key: storageKey,
        file_size: file.size,
        mime_type: file.mimetype,
        sha256_hash: sha256Hash,
        issue_date: issueDate ? new Date(issueDate) : null,
        expiry_date: expiryDate ? new Date(expiryDate) : null,
        status: 'PENDING_VERIFICATION',
        uploaded_by_id: userId,
        parent_document_id: parentDocumentId || null,
      },
      include: {
        license_type: true,
        location: true,
        uploaded_by: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // 5. Automatically recalculate compliance score for affected location
    if (locationId) {
      try {
        await intelligenceService.calculateLocationScore(locationId, orgId);
      } catch (err) {
        console.warn('[DocumentsService] Score recalculation on upload warning:', err.message);
      }
    }

    return document;
  }

  /**
   * Verifies or Rejects an uploaded document (Manager/Admin action)
   */
  async verifyDocument(documentId, orgId, userId, { action, rejectionReason }) {
    if (!['APPROVE', 'REJECT'].includes(action)) {
      throw new BadRequestError("Action must be either 'APPROVE' or 'REJECT'.");
    }

    if (action === 'REJECT' && !rejectionReason) {
      throw new BadRequestError('A rejection reason must be provided when rejecting a document.');
    }

    const document = await prisma.document.findFirst({
      where: { id: documentId, org_id: orgId },
    });

    if (!document) {
      throw new NotFoundError('Document not found in your organization.');
    }

    const newStatus = action === 'APPROVE' ? 'VERIFIED' : 'REJECTED';

    const updatedDocument = await prisma.document.update({
      where: { id: documentId },
      data: {
        status: newStatus,
        rejection_reason: action === 'REJECT' ? rejectionReason.trim() : null,
        verified_by_id: userId,
        verified_at: new Date(),
      },
      include: {
        license_type: true,
        location: true,
        verified_by: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Recalculate compliance score immediately upon verification/rejection
    if (updatedDocument.location_id) {
      try {
        await intelligenceService.calculateLocationScore(updatedDocument.location_id, orgId);
      } catch (err) {
        console.warn('[DocumentsService] Score recalculation on verify warning:', err.message);
      }
    }

    return updatedDocument;
  }

  /**
   * Performs cryptographic document integrity verification
   */
  async verifyIntegrity(documentId, orgId) {
    const document = await prisma.document.findFirst({
      where: { id: documentId, org_id: orgId },
    });

    if (!document) {
      throw new NotFoundError('Document not found.');
    }

    // Retrieve file buffer from storage
    const fileBuffer = await storageService.getFileBuffer(document.storage_key);

    // Compute fresh SHA-256 hash
    const currentHash = computeSha256(fileBuffer);
    const isValid = currentHash === document.sha256_hash;

    return {
      documentId: document.id,
      fileName: document.file_name,
      isValid,
      recordedHash: document.sha256_hash,
      currentHash,
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * Retrieves full renewal history chain for a document
   */
  async getRenewalHistory(documentId, orgId) {
    const targetDoc = await prisma.document.findFirst({
      where: { id: documentId, org_id: orgId },
      include: {
        license_type: true,
        location: true,
        uploaded_by: { select: { id: true, name: true } },
      },
    });

    if (!targetDoc) {
      throw new NotFoundError('Document not found.');
    }

    // Find the root parent
    let root = targetDoc;
    while (root.parent_document_id) {
      const parent = await prisma.document.findFirst({
        where: { id: root.parent_document_id, org_id: orgId },
        include: {
          license_type: true,
          location: true,
          uploaded_by: { select: { id: true, name: true } },
        },
      });
      if (!parent) break;
      root = parent;
    }

    // Collect all descendants from root
    const historyChain = [];
    let current = root;

    while (current) {
      historyChain.push({
        id: current.id,
        fileName: current.file_name,
        sha256Hash: current.sha256_hash,
        issueDate: current.issue_date,
        expiryDate: current.expiry_date,
        status: current.status,
        rejectionReason: current.rejection_reason,
        uploadedAt: current.created_at,
        uploadedBy: current.uploaded_by?.name,
        isTarget: current.id === documentId,
      });

      const child = await prisma.document.findFirst({
        where: { parent_document_id: current.id, org_id: orgId },
        include: {
          uploaded_by: { select: { id: true, name: true } },
        },
      });
      current = child;
    }

    return {
      licenseTypeName: targetDoc.license_type.name,
      totalVersions: historyChain.length,
      history: historyChain,
    };
  }

  /**
   * Lists documents scoped by role and user permissions
   */
  async getDocuments(orgId, user, { locationId, licenseTypeId, status }) {
    const where = { org_id: orgId };

    if (licenseTypeId) where.license_type_id = licenseTypeId;
    if (status) where.status = status;

    if (user.role === 'LOCATION_MANAGER') {
      const allowed = user.accessibleLocationIds || [];
      if (locationId) {
        if (!allowed.includes(locationId)) {
          throw new ForbiddenError('You do not have access to documents for this location.');
        }
        where.location_id = locationId;
      } else {
        where.OR = [{ location_id: { in: allowed } }, { location_id: null }];
      }
    } else if (locationId) {
      where.location_id = locationId;
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        license_type: true,
        location: true,
        uploaded_by: { select: { id: true, name: true } },
        verified_by: { select: { id: true, name: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    // Attach signed download URLs
    const docsWithUrls = await Promise.all(
      documents.map(async (doc) => {
        const downloadUrl = await storageService.getSignedDownloadUrl(doc.storage_key);
        return {
          ...doc,
          downloadUrl,
        };
      })
    );

    return docsWithUrls;
  }

  /**
   * Retrieves single document by ID
   */
  async getDocumentById(documentId, orgId, user) {
    const document = await prisma.document.findFirst({
      where: { id: documentId, org_id: orgId },
      include: {
        license_type: true,
        location: true,
        uploaded_by: { select: { id: true, name: true, email: true } },
        verified_by: { select: { id: true, name: true, email: true } },
      },
    });

    if (!document) {
      throw new NotFoundError('Document not found.');
    }

    if (
      user.role === 'LOCATION_MANAGER' &&
      document.location_id &&
      !user.accessibleLocationIds?.includes(document.location_id)
    ) {
      throw new ForbiddenError('You do not have permission to view documents for this location.');
    }

    const downloadUrl = await storageService.getSignedDownloadUrl(document.storage_key);

    return {
      ...document,
      downloadUrl,
    };
  }
}

module.exports = new DocumentsService();
