const tenancyService = require('./tenancy.service');

class TenancyController {
  /**
   * GET /api/tenancy/organization
   */
  async getOrganization(req, res, next) {
    try {
      const result = await tenancyService.getOrganization(req.orgId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/tenancy/locations
   */
  async getLocations(req, res, next) {
    try {
      const result = await tenancyService.getLocations(req.orgId, req.user);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/tenancy/locations
   */
  async createLocation(req, res, next) {
    try {
      const result = await tenancyService.createLocation(req.orgId, req.body);
      res.status(201).json({
        success: true,
        message: 'Location created successfully.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/tenancy/users
   */
  async getUsers(req, res, next) {
    try {
      const result = await tenancyService.getUsers(req.orgId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/tenancy/users
   */
  async createUser(req, res, next) {
    try {
      const result = await tenancyService.createUser(req.orgId, req.body);
      res.status(201).json({
        success: true,
        message: 'User created successfully.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/tenancy/assign-location
   */
  async assignLocationAccess(req, res, next) {
    try {
      const { userId, locationId } = req.body;
      const result = await tenancyService.assignLocationAccess(req.orgId, userId, locationId);
      res.status(200).json({
        success: true,
        message: 'Location access assigned successfully.',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new TenancyController();
