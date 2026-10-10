const prisma = require('../../config/db');
const { NotFoundError, BadRequestError } = require('../../utils/errors');
const { validateTenantResource } = require('../../middleware/tenantScope');

class IntelligenceService {
  /**
   * Retrieves all registered regulatory license types
   */
  async getLicenseTypes() {
    return await prisma.licenseType.findMany({
      include: {
        dependent_on: {
          include: {
            prerequisite_license_type: {
              select: { id: true, name: true, code: true },
            },
          },
        },
        prerequisite_for: {
          include: {
            license_type: {
              select: { id: true, name: true, code: true },
            },
          },
        },
        license_type_rules: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Retrieves all cascading dependencies between license types
   */
  async getDependencies() {
    return await prisma.dependency.findMany({
      include: {
        license_type: {
          select: { id: true, name: true, code: true },
        },
        prerequisite_license_type: {
          select: { id: true, name: true, code: true },
        },
      },
    });
  }

  /**
   * Retrieves all mandatory license requirements by location type and state
   */
  async getRequiredRules() {
    return await prisma.requiredLicenseType.findMany({
      include: {
        license_type: {
          select: { id: true, name: true, code: true, issuing_authority: true, is_lifetime_valid: true },
        },
      },
    });
  }

  /**
   * Dynamic Rule-Based Compliance Score Calculation Engine
   * Calculates statutory 0–100 score factoring proximity to expiry,
   * lifetime exemptions, jurisdictional gaps, and cascading dependency risks.
   * 
   * @param {string} locationId 
   * @param {string} orgId 
   * @param {boolean} persistSnapshot Whether to log to ComplianceScore table
   */
  async calculateLocationScore(locationId, orgId, persistSnapshot = true) {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      throw new NotFoundError('Location not found.');
    }
    validateTenantResource(location.org_id, orgId);

    // 1. Fetch mandatory requirements for this location's type and state
    const requiredRules = await prisma.requiredLicenseType.findMany({
      where: {
        location_type: location.type,
        OR: [
          { state: null },
          { state: location.state },
        ],
      },
      include: {
        license_type: true,
      },
    });

    // 2. Fetch all current documents for this location + org-wide documents
    const documents = await prisma.document.findMany({
      where: {
        org_id: orgId,
        OR: [
          { location_id: locationId },
          { location_id: null }, // org-wide documents e.g. DGFT_IEC
        ],
      },
      include: {
        license_type: true,
      },
      orderBy: { created_at: 'desc' },
    });

    // Keep the latest document per license_type_id
    const latestDocMap = new Map();
    for (const doc of documents) {
      if (!latestDocMap.has(doc.license_type_id)) {
        latestDocMap.set(doc.license_type_id, doc);
      }
    }

    // 3. Fetch dependencies to check cascading risk
    const dependencies = await prisma.dependency.findMany({
      include: {
        prerequisite_license_type: true,
        license_type: true,
      },
    });

    const suggestions = [];
    const gaps = [];
    let earnedPoints = 0;
    const ruleCount = requiredRules.length;
    const maxPoints = Math.max(ruleCount * 25, 100);
    const now = new Date();

    for (const rule of requiredRules) {
      const lt = rule.license_type;
      const matchingDoc = latestDocMap.get(rule.license_type_id);

      if (!matchingDoc) {
        gaps.push(lt ? lt.name : 'Unknown License');
        suggestions.push({
          type: 'GAP',
          severity: 'HIGH',
          title: `Missing Mandatory License: ${lt?.name || 'Required License'}`,
          desc: `Location type '${location.type}' in ${location.state} mandates ${lt?.name}. No document has been uploaded yet.`,
        });
      } else {
        let docScore = 0;

        if (matchingDoc.status === 'VERIFIED') {
          if (lt?.is_lifetime_valid || !matchingDoc.expiry_date) {
            docScore = 25; // Full marks for permanent/lifetime valid licenses
          } else {
            const daysLeft = Math.ceil(
              (new Date(matchingDoc.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (daysLeft < 0) {
              docScore = 0;
              suggestions.push({
                type: 'EXPIRED',
                severity: 'CRITICAL',
                title: `Expired License: ${lt?.name}`,
                desc: `Expired on ${new Date(matchingDoc.expiry_date).toLocaleDateString()}. Immediate renewal required.`,
              });
            } else if (daysLeft <= 30) {
              docScore = 15; // Proximity penalty for impending expiry
              suggestions.push({
                type: 'EXPIRING_SOON',
                severity: 'MEDIUM',
                title: `Expiring in ${daysLeft} days: ${lt?.name}`,
                desc: `Renewal window open. Submit renewal to avoid compliance score drop.`,
              });
            } else {
              docScore = 25; // Healthy verified license
            }
          }
        } else if (matchingDoc.status === 'PENDING_VERIFICATION') {
          docScore = 10;
          suggestions.push({
            type: 'PENDING',
            severity: 'LOW',
            title: `Verification Pending: ${lt?.name}`,
            desc: `Document uploaded. Awaiting Org Admin review and sign-off.`,
          });
        } else {
          docScore = 0; // REJECTED or EXPIRED
        }

        // Check Cascading Dependency Risk
        const depOnThis = dependencies.filter((d) => d.license_type_id === matchingDoc.license_type_id);
        for (const dep of depOnThis) {
          const prereqDoc = latestDocMap.get(dep.prerequisite_license_type_id);
          const prereqLt = dep.prerequisite_license_type;
          const isPrereqLapsed =
            !prereqDoc ||
            prereqDoc.status === 'EXPIRED' ||
            prereqDoc.status === 'REJECTED' ||
            (prereqDoc.expiry_date && new Date(prereqDoc.expiry_date) < now);

          if (isPrereqLapsed && dep.is_blocking) {
            docScore = Math.max(0, docScore - 15);
            suggestions.push({
              type: 'CASCADING_RISK',
              severity: 'CRITICAL',
              title: `Cascading Risk: ${lt?.name} blocked by ${prereqLt?.name || 'Prerequisite'}`,
              desc: `Prerequisite ${prereqLt?.name} has lapsed! Even though this license may appear active, statutory validity is suspended.`,
            });
          }
        }

        earnedPoints += docScore;
      }
    }

    const finalScore = Math.min(100, Math.round((earnedPoints / maxPoints) * 100));

    const breakdown = {
      totalMandatory: ruleCount,
      uploadedCount: latestDocMap.size,
      gapsCount: gaps.length,
      earnedPoints,
      maxPoints,
      gaps,
    };

    // Update current score on location table
    await prisma.location.update({
      where: { id: locationId },
      data: { current_compliance_score: finalScore },
    });

    // Write historical snapshot if requested
    if (persistSnapshot) {
      await prisma.complianceScore.create({
        data: {
          org_id: orgId,
          location_id: locationId,
          score: finalScore,
          breakdown_json: breakdown,
        },
      });
    }

    return {
      locationId,
      locationName: location.name,
      score: finalScore,
      breakdown,
      suggestions,
    };
  }

  /**
   * Retrieves score trend history for charting
   */
  async getScoreHistory(locationId, orgId) {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      throw new NotFoundError('Location not found.');
    }
    validateTenantResource(location.org_id, orgId);

    return await prisma.complianceScore.findMany({
      where: {
        org_id: orgId,
        location_id: locationId,
      },
      orderBy: { calculated_at: 'asc' },
      take: 50,
    });
  }

  /**
   * Computes organization-wide aggregate compliance score
   */
  async getOrganizationScore(orgId) {
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
    });

    if (locations.length === 0) {
      return { score: 100, locations: [] };
    }

    const totalScore = locations.reduce((sum, loc) => sum + loc.current_compliance_score, 0);
    const avgScore = Math.round(totalScore / locations.length);

    return {
      orgScore: avgScore,
      totalLocations: locations.length,
      locations,
    };
  }
}

module.exports = new IntelligenceService();
