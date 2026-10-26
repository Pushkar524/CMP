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
  async createLocation(orgId, data = {}) {
    const {
      name,
      code,
      type,
      state,
      address,
      city,
      pincode,
      phone,
      gstin,
      employee_count,
      employeeCount,
      operating_hours,
      operatingHours,
      managerName,
      managerEmail,
      managerPassword,
    } = data;

    if (!name || !name.trim()) {
      throw new BadRequestError('Store/Location name is required.');
    }

    const locationData = {
      org_id: orgId,
      name: name.trim(),
      code: code ? code.trim().toUpperCase() : null,
      type: type ? type.trim().toUpperCase() : 'STORE',
      state: state ? state.trim() : null,
      address: address ? address.trim() : null,
      city: city ? city.trim() : null,
      pincode: pincode ? pincode.trim() : null,
      phone: phone ? phone.trim() : null,
      gstin: gstin ? gstin.trim().toUpperCase() : null,
      employee_count: employee_count !== undefined ? employee_count : (employeeCount ? Number(employeeCount) : null),
      operating_hours: operating_hours || operatingHours || null,
      current_compliance_score: 0.0,
      profile_completed: Boolean(code && type && state && address),
    };

    if (managerEmail && managerPassword) {
      if (managerPassword.length < 8) {
        throw new BadRequestError('Manager security key must be at least 8 characters long.');
      }

      const normalizedEmail = managerEmail.toLowerCase().trim();
      const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existingUser) {
        throw new ConflictError('A manager with this email address already exists.');
      }

      const passwordHash = await hashText(managerPassword, 10);

      return await prisma.$transaction(async (tx) => {
        const location = await tx.location.create({ data: locationData });

        const manager = await tx.user.create({
          data: {
            org_id: orgId,
            name: (managerName || 'Location Manager').trim(),
            email: normalizedEmail,
            password_hash: passwordHash,
            role: 'LOCATION_MANAGER',
          },
        });

        await tx.userLocationAccess.create({
          data: { user_id: manager.id, location_id: location.id },
        });

        await tx.notificationPreference.createMany({
          data: ['EXPIRY_WARNING', 'LAPSED_LICENSE', 'CASCADING_RISK'].map((alertType) => ({
            user_id: manager.id,
            alert_type: alertType,
            email_enabled: true,
            in_app_enabled: true,
          })),
        });

        return { location, manager: { id: manager.id, name: manager.name, email: manager.email } };
      });
    }

    // Provision facility directly with full metadata
    const location = await prisma.location.create({ data: locationData });
    return { location, manager: null };
  }

  /**
   * Completes or updates the operational profile for a location.
   */
  async updateLocation(orgId, locationId, user, data) {
    const location = await prisma.location.findFirst({ where: { id: locationId, org_id: orgId } });
    if (!location) throw new NotFoundError('Location not found in this organization.');

    if (user.role !== 'ORG_ADMIN' && !user.accessibleLocationIds.includes(locationId)) {
      throw new ForbiddenError('You do not have access to update this location.');
    }

    const allowedFields = ['name', 'code', 'type', 'state', 'address', 'city', 'pincode', 'phone', 'gstin', 'employee_count', 'operating_hours'];
    const updateData = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) updateData[field] = data[field] === '' ? null : data[field];
    }

    if (updateData.code) updateData.code = updateData.code.trim().toUpperCase();
    if (updateData.type) updateData.type = updateData.type.trim().toUpperCase();
    if (updateData.employee_count !== undefined && updateData.employee_count !== null) {
      updateData.employee_count = Number(updateData.employee_count);
    }

    const nextType = updateData.type ?? location.type;
    const nextState = updateData.state ?? location.state;
    const nextAddress = updateData.address ?? location.address;
    updateData.profile_completed = Boolean(nextType && nextState && nextAddress);

    try {
      return await prisma.location.update({ where: { id: locationId }, data: updateData });
    } catch (err) {
      if (err.code === 'P2002') throw new ConflictError(`A location with code '${updateData.code}' already exists.`);
      throw err;
    }
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
