const prisma = require('../../config/db');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../../utils/errors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class AuditLinkService {
  /**
   * Get all audit links for the org (ORG_ADMIN sees all, others see none)
   */
  async getAuditLinks(user) {
    const links = await prisma.auditLink.findMany({
      where: { org_id: user.org_id },
      include: {
        created_by: { select: { id: true, name: true, email: true } },
        documents: {
          include: {
            document: {
              select: { id: true, file_name: true, status: true, license_type: { select: { name: true } } },
            },
          },
        },
        _count: { select: { access_logs: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return links;
  }

  /**
   * Create a new audit link
   */
  async createAuditLink(user, { title, notes, expires_at, pin, document_ids }) {
    if (!title) throw new BadRequestError('Title is required.');
    if (!expires_at) throw new BadRequestError('Expiry date is required.');
    if (!document_ids || document_ids.length === 0) throw new BadRequestError('At least one document is required.');

    const token = crypto.randomBytes(24).toString('hex');
    const pinHash = pin ? await bcrypt.hash(pin, 10) : null;

    const link = await prisma.auditLink.create({
      data: {
        org_id: user.org_id,
        created_by_id: user.id,
        token,
        pin_hash: pinHash,
        title,
        notes: notes || null,
        expires_at: new Date(expires_at),
        is_active: true,
        documents: {
          create: document_ids.map((doc_id) => ({ document_id: doc_id })),
        },
      },
      include: {
        documents: {
          include: { document: { select: { id: true, file_name: true } } },
        },
      },
    });

    return link;
  }

  /**
   * Revoke (deactivate) an audit link
   */
  async revokeAuditLink(user, linkId) {
    const link = await prisma.auditLink.findFirst({
      where: { id: linkId, org_id: user.org_id },
    });
    if (!link) throw new NotFoundError('Audit link not found.');

    return await prisma.auditLink.update({
      where: { id: linkId },
      data: { is_active: false },
    });
  }

  /**
   * PUBLIC: Get audit data room by token (used by external inspector)
   */
  async getAuditByToken(token, pinEntered) {
    const link = await prisma.auditLink.findUnique({
      where: { token },
      include: {
        organization: { select: { id: true, name: true } },
        documents: {
          include: {
            document: {
              select: {
                id: true,
                file_name: true,
                status: true,
                expiry_date: true,
                issue_date: true,
                license_type: { select: { id: true, name: true, code: true } },
                location: { select: { id: true, name: true, state: true } },
              },
            },
          },
        },
      },
    });

    if (!link) throw new NotFoundError('Audit data room not found or link has expired.');
    if (!link.is_active) throw new ForbiddenError('This audit link has been revoked.');
    if (new Date() > new Date(link.expires_at)) throw new ForbiddenError('This audit link has expired.');

    // PIN verification
    if (link.pin_hash) {
      if (!pinEntered) throw new ForbiddenError('PIN required to access this data room.');
      const pinMatch = await bcrypt.compare(String(pinEntered), link.pin_hash);
      if (!pinMatch) throw new ForbiddenError('Invalid PIN.');
    }

    return link;
  }

  /**
   * PUBLIC: Record an access log entry for an audit link
   */
  async recordAccess(token, { ip_address, user_agent, success }) {
    const link = await prisma.auditLink.findUnique({ where: { token } });
    if (!link) return;

    await prisma.auditLinkAccessLog.create({
      data: {
        audit_link_id: link.id,
        ip_address: ip_address || null,
        user_agent: user_agent || null,
        success: success !== false,
      },
    });
  }
}

module.exports = new AuditLinkService();
