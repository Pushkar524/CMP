const auditLinkService = require('./auditLink.service');

class AuditLinkController {
  async getAuditLinks(req, res, next) {
    try {
      const links = await auditLinkService.getAuditLinks(req.user);
      res.status(200).json({ success: true, audit_links: links });
    } catch (err) { next(err); }
  }

  async createAuditLink(req, res, next) {
    try {
      const link = await auditLinkService.createAuditLink(req.user, req.body);
      res.status(201).json({ success: true, message: 'Audit link created.', audit_link: link });
    } catch (err) { next(err); }
  }

  async revokeAuditLink(req, res, next) {
    try {
      await auditLinkService.revokeAuditLink(req.user, req.params.id);
      res.status(200).json({ success: true, message: 'Audit link revoked.' });
    } catch (err) { next(err); }
  }

  // PUBLIC — no auth needed
  async getAuditByToken(req, res, next) {
    try {
      const { token } = req.params;
      const pin = req.headers['x-audit-pin'] || req.query?.pin || req.body?.pin;
      const link = await auditLinkService.getAuditByToken(token, pin);
      res.status(200).json({ success: true, data: link });
    } catch (err) { next(err); }
  }

  // PUBLIC — record access log
  async recordAuditAccess(req, res, next) {
    try {
      const { token } = req.params;
      await auditLinkService.recordAccess(token, {
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        success: req.body.success !== false,
      });
      res.status(200).json({ success: true });
    } catch (err) { next(err); }
  }

  // PUBLIC — download document within authorized audit data room
  async downloadAuditDocument(req, res, next) {
    try {
      const { token, docId } = req.params;
      const pin = req.headers['x-audit-pin'] || req.query?.pin || req.body?.pin;
      const result = await auditLinkService.getAuditDocumentDownload(token, docId, pin);

      if (result.stream) {
        res.setHeader('Content-Disposition', `attachment; filename="${result.file_name}"`);
        res.setHeader('Content-Type', result.mime_type || 'application/octet-stream');
        result.stream.on('error', (err) => next(err));
        result.stream.pipe(res);
      } else if (result.url) {
        res.redirect(result.url);
      } else {
        res.status(404).json({ success: false, message: 'Document file not found' });
      }
    } catch (err) { next(err); }
  }
}

module.exports = new AuditLinkController();
