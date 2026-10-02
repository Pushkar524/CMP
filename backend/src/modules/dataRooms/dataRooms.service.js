const crypto = require('crypto');
const prisma = require('../../config/db');
const storageService = require('../../services/StorageService');
const { hashText, compareHash } = require('../../utils/hash');
const {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
} = require('../../utils/errors');

class DataRoomsService {
  /**
   * Generates a time-bound, optionally PIN-protected Audit Link for external inspectors
   */
  async createAuditLink({
    orgId,
    userId,
    title,
    notes,
    documentIds = [],
    expiresInDays = 7,
    pin = null,
  }) {
    if (!title) {
      throw new BadRequestError('Title is required for the audit link.');
    }
    if (!documentIds || documentIds.length === 0) {
      throw new BadRequestError('At least one document must be selected for the audit link.');
    }

    // Verify all document IDs belong to this organization
    const docs = await prisma.document.findMany({
      where: {
        id: { in: documentIds },
        org_id: orgId,
      },
    });

    if (docs.length !== documentIds.length) {
      throw new BadRequestError('One or more selected documents do not belong to your organization.');
    }

    // Generate random 48-character hex token
    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + (parseInt(expiresInDays, 10) || 7) * 24 * 60 * 60 * 1000);

    const pinHash = pin ? await hashText(pin.trim(), 10) : null;

    const auditLink = await prisma.$transaction(async (tx) => {
      const link = await tx.auditLink.create({
        data: {
          org_id: orgId,
          created_by_id: userId,
          token,
          pin_hash: pinHash,
          title: title.trim(),
          notes: notes ? notes.trim() : null,
          expires_at: expiresAt,
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

    return {
      id: auditLink.id,
      title: auditLink.title,
      token: auditLink.token,
      shareableUrl: `/api/audit/${auditLink.token}`,
      isPinProtected: Boolean(pin),
      expiresAt: auditLink.expires_at,
      documentCount: documentIds.length,
    };
  }

  /**
   * Lists all audit links created by the organization
   */
  async getAuditLinks(orgId) {
    const links = await prisma.auditLink.findMany({
      where: { org_id: orgId },
      include: {
        created_by: { select: { id: true, name: true, email: true } },
        documents: {
          include: {
            document: {
              include: { license_type: true, location: true },
            },
          },
        },
        _count: {
          select: { access_logs: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const now = new Date();
    return links.map((link) => ({
      id: link.id,
      title: link.title,
      notes: link.notes,
      token: link.token,
      shareableUrl: `/api/audit/${link.token}`,
      isPinProtected: Boolean(link.pin_hash),
      expiresAt: link.expires_at,
      isExpired: new Date(link.expires_at) < now,
      isActive: link.is_active,
      createdAt: link.created_at,
      createdBy: link.created_by.name,
      documentCount: link.documents.length,
      totalAccessCount: link._count.access_logs,
      documents: link.documents.map((d) => ({
        id: d.document.id,
        fileName: d.document.file_name,
        licenseType: d.document.license_type.name,
        locationName: d.document.location?.name || 'Organization-wide',
        status: d.document.status,
      })),
    }));
  }

  /**
   * Revokes / deactivates an audit link
   */
  async revokeAuditLink(auditLinkId, orgId) {
    const link = await prisma.auditLink.findFirst({
      where: { id: auditLinkId, org_id: orgId },
    });

    if (!link) {
      throw new NotFoundError('Audit link not found.');
    }

    return await prisma.auditLink.update({
      where: { id: auditLinkId },
      data: { is_active: false },
    });
  }

  /**
   * Public access verification for external inspectors
   */
  async accessAuditLink(token, { pin = null, clientIp = null, userAgent = null }) {
    const link = await prisma.auditLink.findUnique({
      where: { token },
      include: {
        organization: { select: { name: true, tax_id: true } },
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

    if (!link || !link.is_active || new Date(link.expires_at) < new Date()) {
      if (link) {
        await prisma.auditLinkAccessLog.create({
          data: {
            audit_link_id: link.id,
            ip_address: clientIp,
            user_agent: userAgent,
            success: false,
          },
        });
      }
      throw new UnauthorizedError('This audit link is invalid, expired, or has been revoked.');
    }

    // Check PIN requirement
    if (link.pin_hash) {
      if (!pin) {
        return {
          pinRequired: true,
          title: link.title,
          organizationName: link.organization.name,
          expiresAt: link.expires_at,
        };
      }

      const isPinValid = await compareHash(pin.trim(), link.pin_hash);
      if (!isPinValid) {
        await prisma.auditLinkAccessLog.create({
          data: {
            audit_link_id: link.id,
            ip_address: clientIp,
            user_agent: userAgent,
            success: false,
          },
        });
        throw new UnauthorizedError('Invalid PIN entered for this audit link.');
      }
    }

    // Log successful inspection access
    await prisma.auditLinkAccessLog.create({
      data: {
        audit_link_id: link.id,
        ip_address: clientIp,
        user_agent: userAgent,
        success: true,
      },
    });

    // Generate signed download URLs for each permitted document
    const documents = await Promise.all(
      link.documents.map(async (item) => {
        const doc = item.document;
        const downloadUrl = await storageService.getSignedDownloadUrl(doc.storage_key);
        return {
          id: doc.id,
          fileName: doc.file_name,
          licenseType: doc.license_type.name,
          licenseCode: doc.license_type.code,
          location: doc.location?.name || 'Organization-wide',
          sha256Hash: doc.sha256_hash,
          issueDate: doc.issue_date,
          expiryDate: doc.expiry_date,
          status: doc.status,
          downloadUrl,
        };
      })
    );

    return {
      pinRequired: false,
      title: link.title,
      notes: link.notes,
      organization: link.organization,
      expiresAt: link.expires_at,
      documents,
    };
  }

  /**
   * Retrieves IP access audit trail for a link
   */
  async getAuditLinkLogs(auditLinkId, orgId) {
    const link = await prisma.auditLink.findFirst({
      where: { id: auditLinkId, org_id: orgId },
    });

    if (!link) {
      throw new NotFoundError('Audit link not found.');
    }

    return await prisma.auditLinkAccessLog.findMany({
      where: { audit_link_id: auditLinkId },
      orderBy: { accessed_at: 'desc' },
    });
  }
}

module.exports = new DataRoomsService();
