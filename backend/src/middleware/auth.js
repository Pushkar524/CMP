const { UnauthorizedError } = require('../utils/errors');
const { verifyToken } = require('../utils/jwt');
const prisma = require('../config/db');

/**
 * Authentication Middleware: Verifies JWT and attaches current user to req.user
 */
async function authenticateJWT(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token missing. Please log in.');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('Authentication token malformed.');
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      throw new UnauthorizedError('Invalid authentication token payload.');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        organization: {
          select: { id: true, name: true, tax_id: true },
        },
        user_location_access: {
          select: { location_id: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('The user associated with this token no longer exists.');
    }

    // Attach user to request object
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      org_id: user.org_id,
      organization: user.organization,
      accessibleLocationIds: user.user_location_access.map((acc) => acc.location_id),
    };

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  authenticateJWT,
};
