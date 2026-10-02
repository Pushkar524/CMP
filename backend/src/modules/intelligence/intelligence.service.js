const prisma = require('../../config/db');
const {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} = require('../../utils/errors');

class IntelligenceService {
  /**
   * Lists all license types with prerequisites and rules
   */
  async getLicenseTypes() {
    return await prisma.licenseType.findMany({
      include: {
        prerequisite_for: {
          include: {
            license_type: { select: { id: true, name: true, code: true } },
          },
        },
        dependent_on: {
          include: {
            prerequisite_license_type: { select: { id: true, name: true, code: true } },
          },
        },
        license_type_rules: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Retrieves single license type by ID
   */
  async getLicenseTypeById(id) {
    const licenseType = await prisma.licenseType.findUnique({
      where: { id },
      include: {
        dependent_on: {
          include: { prerequisite_license_type: true },
        },
        prerequisite_for: {
          include: { license_type: true },
        },
        license_type_rules: true,
      },
    });

    if (!licenseType) {
      throw new NotFoundError('License type not found.');
    }

    return licenseType;
  }

  /**
   * Creates a new regulatory license type (Org Admin only)
   */
  async createLicenseType({
    name,
    code,
    description,
    issuing_authority,
    default_validity_months,
    is_lifetime_valid = false,
  }) {
    if (!name || !code) {
      throw new BadRequestError('License name and unique code are required.');
    }

    const normalizedCode = code.trim().toUpperCase().replace(/\s+/g, '_');
    const existing = await prisma.licenseType.findUnique({
      where: { code: normalizedCode },
    });

    if (existing) {
      throw new ConflictError(`License type with code '${normalizedCode}' already exists.`);
    }

    return await prisma.licenseType.create({
      data: {
        name: name.trim(),
        code: normalizedCode,
        description: description?.trim() || null,
        issuing_authority: issuing_authority?.trim() || null,
        default_validity_months: is_lifetime_valid ? null : default_validity_months || 12,
        is_lifetime_valid,
      },
    });
  }

  /**
   * Retrieves all dependencies between licenses
   */
  async getDependencies() {
    return await prisma.dependency.findMany({
      include: {
        license_type: { select: { id: true, name: true, code: true } },
        prerequisite_license_type: { select: { id: true, name: true, code: true } },
      },
    });
  }

  /**
   * Creates a cascading dependency between two license types
   */
  async createDependency({ license_type_id, prerequisite_license_type_id, is_blocking = true }) {
    if (!license_type_id || !prerequisite_license_type_id) {
      throw new BadRequestError('license_type_id and prerequisite_license_type_id are required.');
    }

    if (license_type_id === prerequisite_license_type_id) {
      throw new BadRequestError('A license cannot be a prerequisite for itself.');
    }

    const existing = await prisma.dependency.findUnique({
      where: {
        license_type_id_prerequisite_license_type_id: {
          license_type_id,
          prerequisite_license_type_id,
        },
      },
    });

    if (existing) {
      return existing;
    }

    return await prisma.dependency.create({
      data: {
        license_type_id,
        prerequisite_license_type_id,
        is_blocking,
      },
    });
  }

  /**
   * Retrieves required license types for location types/states
   */
  async getRequiredLicenseTypes(locationType, state) {
    const where = {};
    if (locationType) where.location_type = locationType.toUpperCase();
    if (state) where.OR = [{ state }, { state: null }];

    return await prisma.requiredLicenseType.findMany({
      where,
      include: {
        license_type: true,
      },
    });
  }

  /**
   * Adds required license mapping
   */
  async createRequiredLicenseType({ license_type_id, location_type, state = null, is_mandatory = true }) {
    if (!license_type_id || !location_type) {
      throw new BadRequestError('license_type_id and location_type are required.');
    }

    return await prisma.requiredLicenseType.create({
      data: {
        license_type_id,
        location_type: location_type.trim().toUpperCase(),
        state: state ? state.trim() : null,
        is_mandatory,
      },
    });
  }

  /**
   * 🧠 DYNAMIC COMPLIANCE SCORE ENGINE
   * Calculates a 0-100 score for a location combining:
   * 1. Gap detection (missing mandatory licenses)
   * 2. Expiry proximity (penalizing documents near or past expiry)
   * 3. Lifetime exemptions (PAN, GSTIN, Building Plan)
   * 4. Cascading dependency risks (prerequisite lapses penalize downstream licenses)
   * 5. Document verification state (PENDING, REJECTED, VERIFIED, EXPIRED)
   * @param {string} locationId 
   * @param {string} orgId 
   * @returns {Promise<object>} Complete score breakdown
   */
  async calculateLocationScore(locationId, orgId) {
    const location = await prisma.location.findFirst({
      where: { id: locationId, org_id: orgId },
    });

    if (!location) {
      throw new NotFoundError('Location not found in your organization.');
    }

    // 1. Determine Required License Types for Location Type & State
    const requiredRules = await prisma.requiredLicenseType.findMany({
      where: {
        location_type: location.type,
        OR: [{ state: location.state }, { state: null }],
        is_mandatory: true,
      },
      include: { license_type: true },
    });

    // If no specific rules exist, fallback to all active license types marked non-lifetime or common
    let targetLicenseTypes = requiredRules.map((r) => r.license_type);
    if (targetLicenseTypes.length === 0) {
      targetLicenseTypes = await prisma.licenseType.findMany({ take: 5 });
    }

    // Deduplicate by license_type.id
    const uniqueLicenseTypesMap = new Map();
    for (const lt of targetLicenseTypes) {
      uniqueLicenseTypesMap.set(lt.id, lt);
    }
    const requiredLicenses = Array.from(uniqueLicenseTypesMap.values());

    // 2. Fetch all latest uploaded documents for this location (or org-wide documents)
    const documents = await prisma.document.findMany({
      where: {
        org_id: orgId,
        OR: [{ location_id: locationId }, { location_id: null }],
      },
      orderBy: { created_at: 'desc' },
      include: { license_type: true },
    });

    // Pick latest document per license_type_id
    const latestDocMap = new Map();
    for (const doc of documents) {
      if (!latestDocMap.has(doc.license_type_id)) {
        latestDocMap.set(doc.license_type_id, doc);
      }
    }

    // 3. Load all dependencies to evaluate cascading risk
    const allDependencies = await prisma.dependency.findMany({
      include: {
        license_type: true,
        prerequisite_license_type: true,
      },
    });

    // 4. Map of prerequisite lapses
    // A license type is considered "healthy" if it has a VERIFIED, unexpired document
    const now = new Date();
    const isLicenseHealthy = (licenseTypeId) => {
      const doc = latestDocMap.get(licenseTypeId);
      if (!doc) return false;
      if (doc.status !== 'VERIFIED') return false;
      const lt = uniqueLicenseTypesMap.get(licenseTypeId) || doc.license_type;
      if (lt?.is_lifetime_valid) return true;
      if (!doc.expiry_date) return false;
      return new Date(doc.expiry_date) > now;
    };

    // 5. Evaluate Each Required License
    const licenseEvaluations = [];
    const gaps = [];
    const cascadingRisks = [];
    const recommendations = [];
    let totalScoreAccumulator = 0;

    for (const licenseType of requiredLicenses) {
      const doc = latestDocMap.get(licenseType.id);
      let licenseScore = 0;
      let statusNote = 'OK';
      let hasCascadingRisk = false;
      let cascadingReason = null;
      let daysRemaining = null;

      if (!doc) {
        // GAP: Missing Mandatory License
        licenseScore = 0;
        statusNote = 'MISSING';
        gaps.push(licenseType.name);
        recommendations.push(
          `Action Required: Upload mandatory license '${licenseType.name}' (${licenseType.issuing_authority || 'Authority'}).`
        );
      } else {
        // Document exists - Evaluate status
        if (doc.status === 'REJECTED') {
          licenseScore = 0;
          statusNote = 'REJECTED';
          recommendations.push(
            `Fix & Re-upload: '${licenseType.name}' was rejected. Reason: ${doc.rejection_reason || 'Document non-compliant'}.`
          );
        } else if (doc.status === 'PENDING_VERIFICATION') {
          licenseScore = 50;
          statusNote = 'PENDING_VERIFICATION';
          recommendations.push(
            `Review Pending: Verify uploaded document for '${licenseType.name}'.`
          );
        } else if (doc.status === 'EXPIRED') {
          licenseScore = 0;
          statusNote = 'EXPIRED';
          recommendations.push(
            `Renewal Urgent: '${licenseType.name}' has expired. Apply for immediate renewal.`
          );
        } else if (doc.status === 'VERIFIED') {
          // Check Lifetime Exemption
          if (licenseType.is_lifetime_valid) {
            licenseScore = 100;
            statusNote = 'LIFETIME_VALID';
          } else if (!doc.expiry_date) {
            licenseScore = 60;
            statusNote = 'EXPIRY_DATE_UNSET';
            recommendations.push(
              `Update Expiry: Provide an expiry date for '${licenseType.name}'.`
            );
          } else {
            const expDate = new Date(doc.expiry_date);
            const diffTime = expDate.getTime() - now.getTime();
            daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (daysRemaining <= 0) {
              licenseScore = 0;
              statusNote = 'EXPIRED';
              recommendations.push(
                `Renewal Urgent: '${licenseType.name}' expired ${Math.abs(daysRemaining)} days ago.`
              );
            } else if (daysRemaining <= 15) {
              licenseScore = 50;
              statusNote = 'CRITICAL_EXPIRY_RISK';
              recommendations.push(
                `Warning: '${licenseType.name}' expires in ${daysRemaining} days. Initiate renewal now.`
              );
            } else if (daysRemaining <= 30) {
              licenseScore = 75;
              statusNote = 'APPROACHING_EXPIRY';
              recommendations.push(
                `Notice: '${licenseType.name}' expires in ${daysRemaining} days.`
              );
            } else {
              licenseScore = 100;
              statusNote = 'HEALTHY';
            }
          }
        }

        // Evaluate Cascading Dependency Risk
        const blockingPrereqs = allDependencies.filter(
          (dep) => dep.license_type_id === licenseType.id && dep.is_blocking
        );

        for (const dep of blockingPrereqs) {
          const prereqHealthy = isLicenseHealthy(dep.prerequisite_license_type_id);
          if (!prereqHealthy) {
            hasCascadingRisk = true;
            cascadingReason = `Prerequisite '${dep.prerequisite_license_type.name}' is missing or lapsed.`;
            cascadingRisks.push({
              dependentLicense: licenseType.name,
              prerequisite: dep.prerequisite_license_type.name,
              reason: cascadingReason,
            });
            // Apply cascading penalty: reduce score by 50%
            licenseScore = Math.min(licenseScore * 0.5, 40);
            recommendations.push(
              `Cascading Risk: Renew prerequisite '${dep.prerequisite_license_type.name}' to validate dependent '${licenseType.name}'.`
            );
            break;
          }
        }
      }

      totalScoreAccumulator += licenseScore;

      licenseEvaluations.push({
        licenseTypeId: licenseType.id,
        code: licenseType.code,
        name: licenseType.name,
        isLifetime: licenseType.is_lifetime_valid,
        documentId: doc ? doc.id : null,
        documentStatus: doc ? doc.status : 'NOT_UPLOADED',
        daysUntilExpiry: daysRemaining,
        score: Math.round(licenseScore),
        statusNote,
        hasCascadingRisk,
        cascadingReason,
      });
    }

    // 6. Aggregate Composite Score (0–100)
    const overallScore =
      requiredLicenses.length > 0
        ? Math.round((totalScoreAccumulator / requiredLicenses.length) * 10) / 10
        : 100.0;

    const breakdownJson = {
      locationId: location.id,
      locationName: location.name,
      locationType: location.type,
      locationState: location.state,
      overallScore,
      totalRequiredLicenses: requiredLicenses.length,
      compliantLicensesCount: licenseEvaluations.filter((l) => l.score >= 80).length,
      warningLicensesCount: licenseEvaluations.filter((l) => l.score >= 50 && l.score < 80).length,
      criticalLicensesCount: licenseEvaluations.filter((l) => l.score < 50).length,
      gaps,
      cascadingRisks,
      recommendations,
      licenses: licenseEvaluations,
      calculatedAt: now.toISOString(),
    };

    // 7. Persist Snapshot and Update Location Cache in Transaction
    await prisma.$transaction([
      prisma.complianceScore.create({
        data: {
          org_id: orgId,
          location_id: locationId,
          score: overallScore,
          breakdown_json: breakdownJson,
        },
      }),
      prisma.location.update({
        where: { id: locationId },
        data: { current_compliance_score: overallScore },
      }),
    ]);

    return breakdownJson;
  }

  /**
   * Retrieves org-wide compliance metrics and rollups
   */
  async getOrganizationScoreSummary(orgId) {
    const locations = await prisma.location.findMany({
      where: { org_id: orgId },
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
        state: true,
        current_compliance_score: true,
      },
      orderBy: { current_compliance_score: 'asc' },
    });

    if (locations.length === 0) {
      return {
        averageScore: 100.0,
        totalLocations: 0,
        healthyLocations: 0,
        warningLocations: 0,
        criticalLocations: 0,
        locations: [],
      };
    }

    const totalScore = locations.reduce((sum, l) => sum + l.current_compliance_score, 0);
    const averageScore = Math.round((totalScore / locations.length) * 10) / 10;

    const healthy = locations.filter((l) => l.current_compliance_score >= 85).length;
    const warning = locations.filter(
      (l) => l.current_compliance_score >= 60 && l.current_compliance_score < 85
    ).length;
    const critical = locations.filter((l) => l.current_compliance_score < 60).length;

    return {
      averageScore,
      totalLocations: locations.length,
      healthyLocations: healthy,
      warningLocations: warning,
      criticalLocations: critical,
      locations,
    };
  }

  /**
   * Retrieves historical score trend snapshots for a location
   */
  async getLocationScoreHistory(locationId, orgId, limit = 20) {
    const location = await prisma.location.findFirst({
      where: { id: locationId, org_id: orgId },
    });

    if (!location) {
      throw new NotFoundError('Location not found in your organization.');
    }

    return await prisma.complianceScore.findMany({
      where: { location_id: locationId, org_id: orgId },
      orderBy: { calculated_at: 'desc' },
      take: limit,
      select: {
        id: true,
        score: true,
        breakdown_json: true,
        calculated_at: true,
      },
    });
  }
}

module.exports = new IntelligenceService();
