const intelligenceService = require('./intelligence.service');

class IntelligenceController {
  /**
   * GET /api/intelligence/license-types
   */
  async getLicenseTypes(req, res, next) {
    try {
      const data = await intelligenceService.getLicenseTypes();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/intelligence/license-types/:id
   */
  async getLicenseTypeById(req, res, next) {
    try {
      const data = await intelligenceService.getLicenseTypeById(req.params.id);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/intelligence/license-types
   */
  async createLicenseType(req, res, next) {
    try {
      const data = await intelligenceService.createLicenseType(req.body);
      res.status(201).json({
        success: true,
        message: 'License type registered successfully',
        data,
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
      const data = await intelligenceService.getDependencies();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/intelligence/dependencies
   */
  async createDependency(req, res, next) {
    try {
      const { licenseTypeId, prerequisiteLicenseTypeId, isBlocking } = req.body;
      const data = await intelligenceService.createDependency({
        licenseTypeId,
        prerequisiteLicenseTypeId,
        isBlocking,
      });

      res.status(201).json({
        success: true,
        message: 'Dependency relationship mapped successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/intelligence/dependencies/:id
   */
  async deleteDependency(req, res, next) {
    try {
      const data = await intelligenceService.deleteDependency(req.params.id);
      res.status(200).json({
        success: true,
        message: 'Dependency removed successfully',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/intelligence/rules
   */
  async getRequiredRules(req, res, next) {
    try {
      const { locationType, state } = req.query;
      const data = await intelligenceService.getRequiredRules({
        locationType,
        state,
      });

      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/intelligence/graph
   * Global statutory dependency graph
   */
  async getGlobalGraph(req, res, next) {
    try {
      const data = await intelligenceService.getGlobalDependencyGraph();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/intelligence/locations/:id/graph
   * Location-specific dependency graph with live cascading status
   */
  async getLocationGraph(req, res, next) {
    try {
      const data = await intelligenceService.getLocationDependencyGraph(
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
}

module.exports = new IntelligenceController();
