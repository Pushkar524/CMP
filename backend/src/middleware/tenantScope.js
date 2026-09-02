const { UnauthorizedError, ForbiddenError } = require('../utils/errors');

/**
 * Tenant Scope Middleware
 * Guarantees that every request operates strictly within the authenticated user's organization.
 */
function tenantScope(req, res, next) {
  try {
    if (!req.user || !req.user.org_id) {
      throw new UnauthorizedError('Tenant context missing. Authentication required.');
    }

    // Bind org_id directly to the request object for convenient access in controllers
    req.orgId = req.user.org_id;

    // Guard: Prevent cross-tenant tampering if org_id is provided in body or query
    if (req.body && req.body.org_id && req.body.org_id !== req.orgId) {
      throw new ForbiddenError('Cross-tenant data manipulation is forbidden.');
    }

    if (req.query && req.query.org_id && req.query.org_id !== req.orgId) {
      throw new ForbiddenError('Cross-tenant query access is forbidden.');
    }

    // Force org_id in body if present/required
    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
      req.body.org_id = req.orgId;
    }

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Helper to ensure a fetched entity belongs to the active tenant
 * @param {string} resourceOrgId 
 * @param {string} currentOrgId 
 */
function validateTenantResource(resourceOrgId, currentOrgId) {
  if (resourceOrgId !== currentOrgId) {
    throw new ForbiddenError('You do not have permission to access resources belonging to another organization.');
  }
}

module.exports = {
  tenantScope,
  validateTenantResource,
};
