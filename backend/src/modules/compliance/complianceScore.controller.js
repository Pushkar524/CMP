const complianceScoreService = require('./complianceScore.service');

class ComplianceScoreController {
  /**
   * GET /api/compliance/locations/:id
   * Get latest score and breakdown for a location
   */
  async getLocationScore(req, res, next) {
    try {
      const data = await complianceScoreService.getLocationLatestScore(
        req.params.id,
        req.user.org_id
      );

      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/compliance/locations/:id/recalculate
   * Force recalculate score for a location
   */
  async recalculateLocationScore(req, res, next) {
    try {
      const data = await complianceScoreService.calculateLocationScore(
        req.params.id,
        req.user.org_id
      );

      res.status(200).json({
        success: true,
        message: 'Compliance score recalculated successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/compliance/locations/:id/history
   * Get score history for charts
   */
  async getLocationHistory(req, res, next) {
    try {
      const { limit } = req.query;
      const data = await complianceScoreService.getLocationHistory(
        req.params.id,
        req.user.org_id,
        limit
      );

      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/compliance/organization/overview
   * Get roll-up compliance scores across all locations
   */
  async getOrganizationOverview(req, res, next) {
    try {
      const data = await complianceScoreService.calculateOrganizationScore(
        req.user.org_id
      );

      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ComplianceScoreController();
