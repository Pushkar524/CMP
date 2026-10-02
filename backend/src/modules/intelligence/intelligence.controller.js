const intelligenceService = require('./intelligence.service');

class IntelligenceController {
  /**
   * GET /api/compliance/license-types
   */
  async getLicenseTypes(req, res, next) {
    try {
      const result = await intelligenceService.getLicenseTypes();
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/compliance/license-types
   */
  async createLicenseType(req, res, next) {
    try {
      const result = await intelligenceService.createLicenseType(req.body);
      res.status(201).json({
        success: true,
        message: 'License type created successfully.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/compliance/dependencies
   */
  async getDependencies(req, res, next) {
    try {
      const result = await intelligenceService.getDependencies();
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/compliance/dependencies
   */
  async createDependency(req, res, next) {
    try {
      const result = await intelligenceService.createDependency(req.body);
      res.status(201).json({
        success: true,
        message: 'Dependency created successfully.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/compliance/required-licenses
   */
  async getRequiredLicenseTypes(req, res, next) {
    try {
      const { locationType, state } = req.query;
      const result = await intelligenceService.getRequiredLicenseTypes(locationType, state);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/compliance/required-licenses
   */
  async createRequiredLicenseType(req, res, next) {
    try {
      const result = await intelligenceService.createRequiredLicenseType(req.body);
      res.status(201).json({
        success: true,
        message: 'Required license mapping created successfully.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/compliance/score/location/:locationId/recalculate
   */
  async recalculateLocationScore(req, res, next) {
    try {
      const { locationId } = req.params;
      const result = await intelligenceService.calculateLocationScore(locationId, req.orgId);
      res.status(200).json({
        success: true,
        message: 'Compliance score recalculated successfully.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/compliance/score/location/:locationId
   */
  async getLocationScore(req, res, next) {
    try {
      const { locationId } = req.params;
      const result = await intelligenceService.calculateLocationScore(locationId, req.orgId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/compliance/score/organization
   */
  async getOrganizationScoreSummary(req, res, next) {
    try {
      const result = await intelligenceService.getOrganizationScoreSummary(req.orgId);
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/compliance/score/location/:locationId/history
   */
  async getLocationScoreHistory(req, res, next) {
    try {
      const { locationId } = req.params;
      const limit = parseInt(req.query.limit, 10) || 20;
      const result = await intelligenceService.getLocationScoreHistory(
        locationId,
        req.orgId,
        limit
      );
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new IntelligenceController();
