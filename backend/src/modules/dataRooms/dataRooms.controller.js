const dataRoomsService = require('./dataRooms.service');

class DataRoomsController {
  /**
   * POST /api/data-rooms/audit-links
   */
  async createAuditLink(req, res, next) {
    try {
      const result = await dataRoomsService.createAuditLink(req.orgId, req.user, req.body);
      res.status(201).json({
        success: true,
        message: 'Cloud data room audit link created successfully.',
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
      const links = await dataRoomsService.getAuditLinks(req.orgId);
      res.status(200).json({
        success: true,
        data: links,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/data-rooms/audit-links/:id
   */
  async getAuditLinkById(req, res, next) {
    try {
      const { id } = req.params;
      const link = await dataRoomsService.getAuditLinkById(id, req.orgId);
      res.status(200).json({
        success: true,
        data: link,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/data-rooms/audit-links/:id/revoke
   */
  async revokeAuditLink(req, res, next) {
    try {
      const { id } = req.params;
      const revoked = await dataRoomsService.revokeAuditLink(id, req.orgId);
      res.status(200).json({
        success: true,
        message: 'Audit link revoked successfully.',
        data: revoked,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/data-rooms/public/:token (Public)
   */
  async getPublicAuditRoomMeta(req, res, next) {
    try {
      const { token } = req.params;
      const meta = await dataRoomsService.getPublicAuditRoomMeta(token);
      res.status(200).json({
        success: true,
        data: meta,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/data-rooms/public/:token/access (Public)
   */
  async accessPublicAuditRoom(req, res, next) {
    try {
      const { token } = req.params;
      const { pin } = req.body;
      const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await dataRoomsService.accessPublicAuditRoom(token, pin, {
        ipAddress,
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
