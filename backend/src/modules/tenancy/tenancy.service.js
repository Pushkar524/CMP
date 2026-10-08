const prisma = require('../../config/db');
const { hashText } = require('../../utils/hash');
const {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} = require('../../utils/errors');

class TenancyService {
  /**
   * Retrieves organization details
   */
  async getOrganization(orgId) {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: {
          select: {
            locations: true,
            users: true,
            documents: true,
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundError('Organization not found.');
    }

    return org;
  }

  /**
   * Retrieves locations scoped by role and user access
   */
  async getLocations(orgId, user) {
    if (user.role === 'ORG_ADMIN') {
      return await prisma.location.findMany({
        where: { org_id: orgId },
        include: {
          _count: {
            select: { documents: true },
          },
        },
        orderBy: { name: 'asc' },
      });
    }

    // For Location Manager, return only accessible locations
    return await prisma.location.findMany({
      where: {
        org_id: orgId,
        id: { in: user.accessibleLocationIds || [] },
      },
      include: {
        _count: {
          select: { documents: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Creates a new location within the organization (Org Admin only)
   */
  async createLocation(orgId, { name, code, type, state, address }) {
    if (!name || !code || !type || !state) {
      throw new BadRequestError('Location name, unique code, type, and state are required.');
    }

    // Check unique code within organization
    const existing = await prisma.location.findUnique({
      where: {
        org_id_code: {
          org_id: orgId,
          code: code.trim().toUpperCase(),
        },
      },
    });

    if (existing) {
      throw new ConflictError(`A location with code '${code}' already exists in your organization.`);
    }

    return await prisma.location.create({
      data: {
        org_id: orgId,
        name: name.trim(),
        code: code.trim().toUpperCase(),
        type: type.trim().toUpperCase(),
        state: state.trim(),
        address: address ? address.trim() : null,
        current_compliance_score: 100.0,
      },
    });
  }

  /**
   * Retrieves users within the organization (Org Admin only)
   */
  async getUsers(orgId) {
    return await prisma.user.findMany({
      where: { org_id: orgId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        created_at: true,
        user_location_access: {
          include: {
            location: {
              select: { id: true, name: true, code: true, type: true, state: true },
            },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Creates/invites a new user within the organization (Org Admin only)
   */
  async createUser(orgId, { name, email, password, role, locationIds = [] }) {
    if (!name || !email || !password || !role) {
      throw new BadRequestError('User name, email, password, and role are required.');
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictError('A user with this email address already exists.');
    }

    const passwordHash = await hashText(password, 10);

    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          org_id: orgId,
          name: name.trim(),
          email: normalizedEmail,
          password_hash: passwordHash,
          role,
        },
      });

      // Assign locations if provided and user is LOCATION_MANAGER
      if (role === 'LOCATION_MANAGER' && locationIds.length > 0) {
        await tx.userLocationAccess.createMany({
          data: locationIds.map((locId) => ({
            user_id: user.id,
            location_id: locId,
          })),
        });
      }

      // Initialize default notification preferences
      const alertTypes = ['EXPIRY_WARNING', 'LAPSED_LICENSE', 'CASCADING_RISK'];
      await tx.notificationPreference.createMany({
        data: alertTypes.map((type) => ({
          user_id: user.id,
          alert_type: type,
          email_enabled: true,
          in_app_enabled: true,
        })),
      });

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      };
    });
  }

  /**
   * Assigns locations to a Location Manager
   */
  async assignLocationAccess(orgId, userId, locationId) {
    const user = await prisma.user.findFirst({
      where: { id: userId, org_id: orgId },
    });

    if (!user) {
      throw new NotFoundError('User not found in this organization.');
    }

    const location = await prisma.location.findFirst({
      where: { id: locationId, org_id: orgId },
    });

    if (!location) {
      throw new NotFoundError('Location not found in this organization.');
    }

    return await prisma.userLocationAccess.upsert({
      where: {
        user_id_location_id: {
          user_id: userId,
          location_id: locationId,
        },
      },
      update: {},
      create: {
        user_id: userId,
        location_id: locationId,
      },
    });
  }
}

module.exports = new TenancyService();
