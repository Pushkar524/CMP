const intelligenceService = require('./intelligence.service');

class IntelligenceController {
  /**
   * GET /api/intelligence/license-types
   */
  async getLicenseTypes(req, res, next) {
    try {
      const types = await intelligenceService.getLicenseTypes();
      res.status(200).json({
        success: true,
        data: types,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/intelligence/dependencies
   */
  async getDependencies(req, res, next) {
    try {
      const deps = await intelligenceService.getDependencies();
      res.status(200).json({
        success: true,
        data: deps,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/intelligence/required-rules
   */
  async getRequiredRules(req, res, next) {
    try {
      const rules = await intelligenceService.getRequiredRules();
      res.status(200).json({
        success: true,
        data: rules,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/intelligence/compliance-score/location/:id
   */
  async getLocationScore(req, res, next) {
    try {
      const { id } = req.params;
      const recalculate = req.query.recalculate === 'true';
      const score = await intelligenceService.calculateLocationScore(id, req.orgId, recalculate);
      res.status(200).json({
        success: true,
        data: score,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/intelligence/compliance-score/history/:locationId
   */
  async getScoreHistory(req, res, next) {
    try {
      const { locationId } = req.params;
      const history = await intelligenceService.getScoreHistory(locationId, req.orgId);
      res.status(200).json({
        success: true,
        data: history,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/intelligence/compliance-score/organization
   */
  async getOrganizationScore(req, res, next) {
    try {
      const score = await intelligenceService.getOrganizationScore(req.orgId);
      res.status(200).json({
        success: true,
        data: score,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new IntelligenceController();
