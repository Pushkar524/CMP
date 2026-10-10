const crypto = require('crypto');
const prisma = require('../../config/db');
const storageService = require('../../services/StorageService');
const { hashText, compareHash } = require('../../utils/hash');
const { NotFoundError, BadRequestError, ForbiddenError, UnauthorizedError } = require('../../utils/errors');
const { validateTenantResource } = require('../../middleware/tenantScope');

class DataRoomsService {
  /**
   * Generates a time-bound, optionally PIN-protected audit link for external inspectors
   */
  async createAuditLink(orgId, user, { title, notes, expiresAt, pin, documentIds = [] }) {
    if (!title) {
      throw new BadRequestError('Audit link title is required.');
    }
    if (!expiresAt) {
      throw new BadRequestError('Expiration date is required.');
    }
    if (!documentIds || documentIds.length === 0) {
      throw new BadRequestError('At least one document must be attached to the audit data room.');
    }

    const expiryDate = new Date(expiresAt);
    if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
      throw new BadRequestError('Expiration date must be a valid future timestamp.');
    }

    // Verify all documents belong to this organization
    const docs = await prisma.document.findMany({
      where: {
        id: { in: documentIds },
        org_id: orgId,
      },
    });

    if (docs.length !== documentIds.length) {
      throw new BadRequestError('One or more selected documents do not exist or belong to another organization.');
    }

    // Generate cryptographic token
    const token = `audit_${crypto.randomBytes(18).toString('hex')}`;

    // Hash PIN if provided
    let pinHash = null;
    if (pin && pin.trim().length > 0) {
      pinHash = await hashText(pin.trim(), 10);
    }

    // Create AuditLink and link documents
    const auditLink = await prisma.$transaction(async (tx) => {
      const link = await tx.auditLink.create({
        data: {
          org_id: orgId,
          created_by_id: user.id,
          token,
          pin_hash: pinHash,
          title: title.trim(),
          notes: notes ? notes.trim() : null,
          expires_at: expiryDate,
          is_active: true,
        },
      });

      await tx.auditLinkDocument.createMany({
        data: documentIds.map((docId) => ({
          audit_link_id: link.id,
          document_id: docId,
        })),
      });

      return link;
    });

    return await this.getAuditLinkById(auditLink.id, orgId);
  }

  /**
   * Retrieves all audit links created in the organization
   */
  async getAuditLinks(orgId) {
    return await prisma.auditLink.findMany({
      where: { org_id: orgId },
      include: {
        created_by: {
          select: { id: true, name: true, email: true },
        },
        documents: {
          include: {
            document: {
              include: {
                license_type: { select: { name: true, code: true } },
                location: { select: { name: true, code: true } },
              },
            },
          },
        },
        access_logs: {
          orderBy: { accessed_at: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            documents: true,
            access_logs: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Retrieves a single audit link by ID with full details
   */
  async getAuditLinkById(id, orgId) {
    const link = await prisma.auditLink.findUnique({
      where: { id },
      include: {
        created_by: {
          select: { id: true, name: true, email: true },
        },
        documents: {
          include: {
            document: {
              include: {
                license_type: true,
                location: true,
              },
            },
          },
        },
        access_logs: {
          orderBy: { accessed_at: 'desc' },
        },
        _count: {
          select: {
            documents: true,
            access_logs: true,
          },
        },
      },
    });

    if (!link) {
      throw new NotFoundError('Audit link not found.');
    }
    validateTenantResource(link.org_id, orgId);

    return link;
  }

  /**
   * Revokes an active audit link
   */
  async revokeAuditLink(id, orgId) {
    const link = await this.getAuditLinkById(id, orgId);

    return await prisma.auditLink.update({
      where: { id: link.id },
      data: { is_active: false },
    });
  }

  /**
   * Public: Checks validity of an audit link token for an external inspector
   */
  async getPublicAuditRoomMeta(token) {
    const link = await prisma.auditLink.findUnique({
      where: { token },
      include: {
        organization: {
          select: { name: true },
        },
        _count: {
          select: { documents: true },
        },
      },
    });

    if (!link) {
      throw new NotFoundError('Audit data room not found or link is invalid.');
    }

    const isExpired = new Date(link.expires_at) < new Date();

    return {
      token: link.token,
      title: link.title,
      notes: link.notes,
      organizationName: link.organization.name,
      documentCount: link._count.documents,
      expiresAt: link.expires_at,
      isActive: link.is_active,
      isExpired,
      requiresPin: Boolean(link.pin_hash),
    };
  }

  /**
   * Public: Validates PIN (if required) and returns documents with signed download URLs
   */
  async accessPublicAuditRoom(token, pin, { ipAddress, userAgent } = {}) {
    const link = await prisma.auditLink.findUnique({
      where: { token },
      include: {
        organization: { select: { name: true } },
        documents: {
          include: {
            document: {
              include: {
                license_type: true,
                location: true,
              },
            },
          },
        },
      },
    });

    if (!link) {
      throw new NotFoundError('Audit data room not found.');
    }

    if (!link.is_active) {
      throw new ForbiddenError('This audit data room has been revoked by the issuing organization.');
    }

    if (new Date(link.expires_at) < new Date()) {
      throw new ForbiddenError('This audit share link has expired.');
    }

    // Verify PIN if required
    let isSuccess = true;
    if (link.pin_hash) {
      if (!pin) {
        isSuccess = false;
      } else {
        isSuccess = await compareHash(pin.trim(), link.pin_hash);
      }
    }

    // Log the access attempt
    await prisma.auditLinkAccessLog.create({
      data: {
        audit_link_id: link.id,
        ip_address: ipAddress || 'Unknown IP',
        user_agent: userAgent || 'Unknown Agent',
        success: isSuccess,
      },
    });

    if (!isSuccess) {
      throw new UnauthorizedError('Invalid PIN code. Access denied.');
    }

    // Generate signed download URLs for each attached document
    const docsWithSignedUrls = await Promise.all(
      link.documents.map(async ({ document: doc }) => {
        let downloadUrl = null;
        try {
          downloadUrl = await storageService.getSignedDownloadUrl(doc.storage_key, 7200);
        } catch (err) {
          console.error('[DataRoomsService] Error generating signed URL:', err.message);
        }

        return {
          id: doc.id,
          fileName: doc.file_name,
          fileSize: doc.file_size,
          mimeType: doc.mime_type,
          sha256Hash: doc.sha256_hash,
          issueDate: doc.issue_date,
          expiryDate: doc.expiry_date,
          status: doc.status,
          licenseType: doc.license_type,
          location: doc.location,
          downloadUrl,
        };
      })
    );

    return {
      title: link.title,
      notes: link.notes,
      organizationName: link.organization.name,
      expiresAt: link.expires_at,
      documents: docsWithSignedUrls,
    };
  }
}

module.exports = new DataRoomsService();
