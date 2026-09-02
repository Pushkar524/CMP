const { ForbiddenError, BadRequestError } = require('../utils/errors');

/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts route access to specific roles (e.g. ORG_ADMIN, LOCATION_MANAGER)
 * @param  {...string} allowedRoles 
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('User session not found.');
      }

      if (!allowedRoles.includes(req.user.role)) {
        throw new ForbiddenError(
          `Access denied. Role '${req.user.role}' does not have permission for this resource.`
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Scoped Location Access Verification Middleware
 * Ensures that LOCATION_MANAGERs can only access locations they are assigned to.
 * ORG_ADMINs automatically bypass location checks.
 * @param {string} locationIdSource - Field source: 'params', 'body', 'query', or custom key
 * @param {string} fieldName - Parameter name, defaults to 'locationId' or 'location_id'
 */
function verifyLocationAccess(fieldName = 'locationId', locationIdSource = 'params') {
  return (req, res, next) => {
    try {
      if (!req.user) {
        throw new ForbiddenError('User session not found.');
      }

      // Org Admins have full access across all organization locations
      if (req.user.role === 'ORG_ADMIN') {
        return next();
      }

      // Extract location_id from params, body, or query
      let targetLocationId = null;
      if (locationIdSource === 'params') {
        targetLocationId = req.params[fieldName] || req.params.locationId || req.params.id;
      } else if (locationIdSource === 'body') {
        targetLocationId = req.body[fieldName] || req.body.location_id;
      } else if (locationIdSource === 'query') {
        targetLocationId = req.query[fieldName] || req.query.location_id;
      }

      // If no location ID was targeted (e.g. global/org-wide document), allow or handle accordingly
      if (!targetLocationId) {
        return next();
      }

      const hasAccess = req.user.accessibleLocationIds?.includes(targetLocationId);
      if (!hasAccess) {
        throw new ForbiddenError(
          'Access denied. You do not have permission to manage or view this location.'
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  authorizeRoles,
  verifyLocationAccess,
};
