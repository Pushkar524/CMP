const dataRoomsService = require('./dataRooms.service');

class DataRoomsController {
  /**
   * POST /api/data-rooms/audit-links
   */
  async createAuditLink(req, res, next) {
    try {
      const { title, notes, documentIds, expiresInDays, pin } = req.body;
      const result = await dataRoomsService.createAuditLink({
        orgId: req.orgId,
        userId: req.user.id,
        title,
        notes,
        documentIds,
        expiresInDays,
        pin,
      });

      res.status(201).json({
        success: true,
        message: 'Audit Link created successfully.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/data-rooms/audit-links
   */
  async getAuditLinks(req, res, next) {
    try {
      const result = await dataRoomsService.getAuditLinks(req.orgId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/data-rooms/audit-links/:id
   */
  async revokeAuditLink(req, res, next) {
    try {
      const { id } = req.params;
      await dataRoomsService.revokeAuditLink(id, req.orgId);
      res.status(200).json({
        success: true,
        message: 'Audit Link revoked successfully.',
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/data-rooms/audit-links/:id/logs
   */
  async getAuditLinkLogs(req, res, next) {
    try {
      const { id } = req.params;
      const result = await dataRoomsService.getAuditLinkLogs(id, req.orgId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Public Inspector Access:
   * GET /api/audit/:token or POST /api/audit/:token
   */
  async accessAuditLink(req, res, next) {
    try {
      const { token } = req.params;
      const pin = req.body?.pin || req.query?.pin || null;
      const clientIp = req.ip || req.connection?.remoteAddress || null;
      const userAgent = req.get('user-agent') || null;

      const result = await dataRoomsService.accessAuditLink(token, {
        pin,
        clientIp,
        userAgent,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DataRoomsController();
