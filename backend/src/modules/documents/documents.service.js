const prisma = require('../../config/db');
const storageService = require('../../services/StorageService');
const { computeSha256 } = require('../../utils/hash');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../../utils/errors');
const { validateTenantResource } = require('../../middleware/tenantScope');
const intelligenceService = require('../intelligence/intelligence.service');

class DocumentsService {
  /**
   * Retrieves documents filtered by location, type, or verification status
   */
  async getDocuments(orgId, user, { locationId, licenseTypeId, status } = {}) {
    const where = { org_id: orgId };

    // Role-based scoping: Location Managers only see their assigned locations + org-wide docs
    if (user.role === 'LOCATION_MANAGER') {
      const allowedLocationIds = user.accessibleLocationIds || [];
      if (locationId) {
        if (!allowedLocationIds.includes(locationId)) {
          throw new ForbiddenError('Access denied to this location.');
        }
        where.location_id = locationId;
      } else {
        where.OR = [
          { location_id: { in: allowedLocationIds } },
          { location_id: null }, // org-wide documents
        ];
      }
    } else if (locationId) {
      where.location_id = locationId;
    }

    if (licenseTypeId) {
      where.license_type_id = licenseTypeId;
    }

    if (status) {
      where.status = status;
    }

    return await prisma.document.findMany({
      where,
      include: {
        license_type: true,
        location: {
          select: { id: true, name: true, code: true, type: true, state: true },
        },
        uploaded_by: {
          select: { id: true, name: true, email: true },
        },
        verified_by: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Retrieves a single document by ID
   */
  async getDocumentById(docId, orgId) {
    const doc = await prisma.document.findUnique({
      where: { id: docId },
      include: {
        license_type: true,
        location: true,
        uploaded_by: { select: { id: true, name: true, email: true } },
        verified_by: { select: { id: true, name: true, email: true } },
      },
    });

    if (!doc) {
      throw new NotFoundError('Document not found.');
    }
    validateTenantResource(doc.org_id, orgId);

    return doc;
  }

  /**
   * Uploads a document, computes SHA-256 cryptographic hash,
   * pushes file to MinIO/S3, and registers the database record.
   */
  async uploadDocument({ orgId, user, file, metadata }) {
    if (!file) {
      throw new BadRequestError('Document file is required.');
    }
    if (!metadata.license_type_id) {
      throw new BadRequestError('License type ID is required.');
    }

    // Verify license type exists
    const licenseType = await prisma.licenseType.findUnique({
      where: { id: metadata.license_type_id },
    });
    if (!licenseType) {
      throw new NotFoundError('License type not found.');
    }

    // If location_id is provided, verify it belongs to tenant
    if (metadata.location_id) {
      const location = await prisma.location.findUnique({
        where: { id: metadata.location_id },
      });
      if (!location) {
        throw new NotFoundError('Location not found.');
      }
      validateTenantResource(location.org_id, orgId);

      // Check manager access
      if (user.role === 'LOCATION_MANAGER' && !user.accessibleLocationIds?.includes(metadata.location_id)) {
        throw new ForbiddenError('You do not have access to upload documents for this location.');
      }
    }

    // 1. Compute SHA-256 cryptographic hash
    const sha256Hash = computeSha256(file.buffer);

    // 2. Upload file to Object Storage (MinIO / S3)
    const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storageKey = `org_${orgId}/${Date.now()}_${sanitizedName}`;
    await storageService.uploadFile(file.buffer, file.mimetype, storageKey);

    // 3. Create document record
    const document = await prisma.document.create({
      data: {
        org_id: orgId,
        location_id: metadata.location_id || null,
        license_type_id: metadata.license_type_id,
        file_name: file.originalname,
        storage_key: storageKey,
        file_size: file.size,
        mime_type: file.mimetype,
        sha256_hash: sha256Hash,
        issue_date: metadata.issue_date ? new Date(metadata.issue_date) : null,
        expiry_date: metadata.expiry_date ? new Date(metadata.expiry_date) : null,
        status: 'PENDING_VERIFICATION',
        uploaded_by_id: user.id,
        parent_document_id: metadata.parent_document_id || null,
      },
      include: {
        license_type: true,
        location: true,
        uploaded_by: { select: { id: true, name: true, email: true } },
      },
    });

    // 4. Trigger score recalculation if tied to a location
    if (metadata.location_id) {
      try {
        await intelligenceService.calculateLocationScore(metadata.location_id, orgId, false);
      } catch (err) {
        console.warn('[DocumentsService] Background score recalculation warning:', err.message);
      }
    }

    return document;
  }

  /**
   * Verifies or rejects a pending document (Org Admin / Location Manager)
   */
  async verifyDocument(docId, orgId, user, { approve, rejectionReason }) {
    const doc = await this.getDocumentById(docId, orgId);

    const isApproved = Boolean(approve);
    if (!isApproved && !rejectionReason) {
      throw new BadRequestError('A reason is required when rejecting a document.');
    }

    const updatedDoc = await prisma.document.update({
      where: { id: docId },
      data: {
        status: isApproved ? 'VERIFIED' : 'REJECTED',
        rejection_reason: isApproved ? null : rejectionReason.trim(),
        verified_by_id: user.id,
        verified_at: new Date(),
      },
      include: {
        license_type: true,
        location: true,
        uploaded_by: { select: { id: true, name: true, email: true } },
        verified_by: { select: { id: true, name: true, email: true } },
      },
    });

    // Trigger score recalculation upon verification change
    if (updatedDoc.location_id) {
      try {
        await intelligenceService.calculateLocationScore(updatedDoc.location_id, orgId, true);
      } catch (err) {
        console.warn('[DocumentsService] Score recalculation warning:', err.message);
      }
    }

    return updatedDoc;
  }

  /**
   * Renews a document by uploading a new version linked to the parent document
   */
  async renewDocument(parentDocId, orgId, user, file, metadata) {
    const parentDoc = await this.getDocumentById(parentDocId, orgId);

    return await this.uploadDocument({
      orgId,
      user,
      file,
      metadata: {
        ...metadata,
        license_type_id: parentDoc.license_type_id,
        location_id: parentDoc.location_id,
        parent_document_id: parentDoc.id,
      },
    });
  }

  /**
   * Retrieves full renewal version history chain for a document
   */
  async getDocumentHistory(docId, orgId) {
    const currentDoc = await this.getDocumentById(docId, orgId);

    // Traverse up to find root ancestor
    let root = currentDoc;
    while (root.parent_document_id) {
      const parent = await prisma.document.findUnique({
        where: { id: root.parent_document_id },
      });
      if (!parent) break;
      root = parent;
    }

    // Traverse down collecting all versions
    const allVersions = [root];
    const queue = [root.id];

    while (queue.length > 0) {
      const currentId = queue.shift();
      const children = await prisma.document.findMany({
        where: { parent_document_id: currentId },
        include: {
          uploaded_by: { select: { id: true, name: true, email: true } },
          verified_by: { select: { id: true, name: true, email: true } },
        },
        orderBy: { created_at: 'asc' },
      });

      for (const child of children) {
        allVersions.push(child);
        queue.push(child.id);
      }
    }

    return allVersions;
  }

  /**
   * Verifies cryptographic SHA-256 integrity against object storage
   */
  async verifyIntegrity(docId, orgId) {
    const doc = await this.getDocumentById(docId, orgId);

    // Fetch raw stream from MinIO / S3
    const stream = await storageService.getFileStream(doc.storage_key);

    // Read stream into buffer
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    const actualHash = computeSha256(buffer);
    const isValid = actualHash === doc.sha256_hash;

    return {
      documentId: doc.id,
      fileName: doc.file_name,
      storedHash: doc.sha256_hash,
      calculatedHash: actualHash,
      isTamperEvident: true,
      integrityVerified: isValid,
      status: isValid ? 'VALID_UNALTERED' : 'TAMPER_DETECTED',
    };
  }

  /**
   * Generates a secure pre-signed download URL
   */
  async getDownloadUrl(docId, orgId) {
    const doc = await this.getDocumentById(docId, orgId);
    const downloadUrl = await storageService.getSignedDownloadUrl(doc.storage_key, 3600);
    return {
      downloadUrl,
      fileName: doc.file_name,
      mimeType: doc.mime_type,
      expiresIn: 3600,
    };
  }
}

module.exports = new DocumentsService();
