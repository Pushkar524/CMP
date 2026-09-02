const prisma = require('../../config/db');
const { hashText, compareHash } = require('../../utils/hash');
const { signToken } = require('../../utils/jwt');
const {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
} = require('../../utils/errors');

class AuthService {
  /**
   * Authenticates user with email and password
   * @param {string} email 
   * @param {string} password 
   */
  async login(email, password) {
    if (!email || !password) {
      throw new BadRequestError('Email and password are required.');
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            tax_id: true,
          },
        },
        user_location_access: {
          include: {
            location: {
              select: {
                id: true,
                name: true,
                code: true,
                type: true,
                state: true,
                current_compliance_score: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    const isMatch = await compareHash(password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password.');
    }

    // Generate JWT token
    const token = signToken({
      userId: user.id,
      orgId: user.org_id,
      role: user.role,
    });

    // Format accessible locations
    const accessibleLocations = user.user_location_access.map((acc) => acc.location);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.created_at,
      },
      organization: user.organization,
      accessibleLocations,
    };
  }

  /**
   * Registers a new organization and its initial Org Admin
   */
  async registerOrgAdmin({ organizationName, taxId, adminName, email, password }) {
    if (!organizationName || !adminName || !email || !password) {
      throw new BadRequestError('Organization name, admin name, email, and password are required.');
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictError('A user with this email address already exists.');
    }

    // Check tax_id if provided
    if (taxId) {
      const existingOrg = await prisma.organization.findUnique({
        where: { tax_id: taxId.trim() },
      });
      if (existingOrg) {
        throw new ConflictError('An organization with this Tax ID / GSTIN is already registered.');
      }
    }

    const passwordHash = await hashText(password, 10);

    // Create Org + Admin user in transaction
    const result = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: organizationName.trim(),
          tax_id: taxId ? taxId.trim() : null,
        },
      });

      const admin = await tx.user.create({
        data: {
          org_id: org.id,
          name: adminName.trim(),
          email: normalizedEmail,
          password_hash: passwordHash,
          role: 'ORG_ADMIN',
        },
      });

      // Initialize default notification preferences
      const alertTypes = ['EXPIRY_WARNING', 'LAPSED_LICENSE', 'CASCADING_RISK'];
      await tx.notificationPreference.createMany({
        data: alertTypes.map((type) => ({
          user_id: admin.id,
          alert_type: type,
          email_enabled: true,
          sms_enabled: false,
          in_app_enabled: true,
        })),
      });

      return { org, admin };
    });

    const token = signToken({
      userId: result.admin.id,
      orgId: result.org.id,
      role: result.admin.role,
    });

    return {
      token,
      user: {
        id: result.admin.id,
        name: result.admin.name,
        email: result.admin.email,
        role: result.admin.role,
      },
      organization: {
        id: result.org.id,
        name: result.org.name,
        tax_id: result.org.tax_id,
      },
      accessibleLocations: [],
    };
  }

  /**
   * Retrieves profile of current logged-in user
   * @param {string} userId 
   */
  async getCurrentUser(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
        user_location_access: {
          include: {
            location: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User profile not found.');
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.created_at,
      },
      organization: user.organization,
      accessibleLocations: user.user_location_access.map((acc) => acc.location),
    };
  }

  /**
   * Changes the password of an existing user
   */
  async changePassword(userId, oldPassword, newPassword) {
    if (!oldPassword || !newPassword) {
      throw new BadRequestError('Old password and new password are required.');
    }

    if (newPassword.length < 6) {
      throw new BadRequestError('New password must be at least 6 characters long.');
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found.');
    }

    const isMatch = await compareHash(oldPassword, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('Current password is incorrect.');
    }

    const newHash = await hashText(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password_hash: newHash },
    });

    return { message: 'Password updated successfully.' };
  }
}

module.exports = new AuthService();
