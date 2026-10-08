const prisma = require('../../config/db');
const { NotFoundError } = require('../../utils/errors');

class ComplianceScoreService {
  /**
   * Evaluates and persists the 0-100 compliance score for a specific location
   * @param {string} locationId
   * @param {string} orgId
   * @returns {Promise<Object>} The score breakdown and updated location
   */
  async calculateLocationScore(locationId, orgId) {
    const location = await prisma.location.findFirst({
      where: { id: locationId, org_id: orgId },
      include: {
        organization: { select: { id: true, name: true } },
      },
    });

    if (!location) {
      throw new NotFoundError(`Location with ID ${locationId} not found in this organization`);
    }

    // 1. Fetch mandatory required license types for this location type and state
    const requiredLicenses = await prisma.requiredLicenseType.findMany({
      where: {
        location_type: location.type,
        is_mandatory: true,
        OR: [
          { state: null },
          { state: location.state },
        ],
      },
      include: {
        license_type: true,
      },
    });

    // 2. Fetch all current documents for this location (or org-wide documents)
    const documents = await prisma.document.findMany({
      where: {
        org_id: orgId,
        OR: [
          { location_id: locationId },
          { location_id: null }, // Org-wide licenses like GST, PAN, DGFT
        ],
      },
      include: {
        license_type: true,
      },
      orderBy: { created_at: 'desc' },
    });

    // Group documents by license_type_id to get the most recent document
    const docMapByLicense = new Map();
    for (const doc of documents) {
      if (!docMapByLicense.has(doc.license_type_id)) {
        docMapByLicense.set(doc.license_type_id, doc);
      }
    }

    const now = new Date();
    const deductions = [];
    const suggestedActions = [];
    let compliantCount = 0;
    let expiringSoonCount = 0;
    let expiredCount = 0;
    let missingCount = 0;
    let pendingVerificationCount = 0;

    // 3. Evaluate each required license type
    for (const req of requiredLicenses) {
      const lt = req.license_type;
      const doc = docMapByLicense.get(lt.id);

      // Case A: Missing Mandatory Document (Gap Detection)
      if (!doc) {
        missingCount++;
        const penalty = 20.0;
        deductions.push({
          licenseId: lt.id,
          licenseCode: lt.code,
          licenseName: lt.name,
          penalty,
          reason: 'Mandatory license document is missing',
          severity: 'CRITICAL',
          status: 'MISSING',
          recommendation: `Upload a valid ${lt.name} document to recover +${penalty.toFixed(1)} pts.`,
        });
        suggestedActions.push(`Upload missing document for ${lt.name} (+${penalty.toFixed(1)} pts)`);
        continue;
      }

      // Case B: Document was Rejected
      if (doc.status === 'REJECTED') {
        const penalty = 15.0;
        deductions.push({
          licenseId: lt.id,
          licenseCode: lt.code,
          licenseName: lt.name,
          penalty,
          reason: `Document was rejected: ${doc.rejection_reason || 'Failed compliance check'}`,
          severity: 'HIGH',
          status: 'REJECTED',
          recommendation: `Re-upload a revised ${lt.name} to clear the rejection.`,
        });
        suggestedActions.push(`Re-upload rejected document for ${lt.name} (+${penalty.toFixed(1)} pts)`);
        continue;
      }

      // Case C: Document is Pending Verification
      if (doc.status === 'PENDING_VERIFICATION') {
        pendingVerificationCount++;
        const penalty = 3.0;
        deductions.push({
          licenseId: lt.id,
          licenseCode: lt.code,
          licenseName: lt.name,
          penalty,
          reason: 'Document uploaded but awaiting manager verification',
          severity: 'LOW',
          status: 'PENDING_VERIFICATION',
          recommendation: `Verify document ${doc.file_name} to restore +${penalty.toFixed(1)} pts.`,
        });
        suggestedActions.push(`Verify ${lt.name} (${doc.file_name}) to restore +${penalty.toFixed(1)} pts`);
        continue;
      }

      // Case D: Lifetime Valid Exemption
      if (lt.is_lifetime_valid) {
        compliantCount++;
        // No expiry penalties ever apply to lifetime valid documents (e.g. PAN, GST)
        continue;
      }

      // Case E: Date-Bound License - Evaluate Expiry Proximity
      if (doc.expiry_date) {
        const expiryDate = new Date(doc.expiry_date);
        const diffMs = expiryDate.getTime() - now.getTime();
        const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (daysRemaining <= 0 || doc.status === 'EXPIRED') {
          expiredCount++;
          const penalty = 18.0;
          deductions.push({
            licenseId: lt.id,
            licenseCode: lt.code,
            licenseName: lt.name,
            penalty,
            reason: `License expired on ${expiryDate.toLocaleDateString()}`,
            severity: 'CRITICAL',
            status: 'EXPIRED',
            daysRemaining,
            recommendation: `Submit renewal certificate immediately for ${lt.name}.`,
          });
          suggestedActions.push(`Renew expired license: ${lt.name} (+${penalty.toFixed(1)} pts)`);
        } else if (daysRemaining <= 7) {
          expiringSoonCount++;
          const penalty = 10.0;
          deductions.push({
            licenseId: lt.id,
            licenseCode: lt.code,
            licenseName: lt.name,
            penalty,
            reason: `Critical expiry: Only ${daysRemaining} day(s) remaining`,
            severity: 'HIGH',
            status: 'EXPIRING_CRITICAL',
            daysRemaining,
            recommendation: `Submit urgent renewal application before ${expiryDate.toLocaleDateString()}.`,
          });
          suggestedActions.push(`Urgent: Renew ${lt.name} (expires in ${daysRemaining}d)`);
        } else if (daysRemaining <= 30) {
          expiringSoonCount++;
          const penalty = 5.0;
          deductions.push({
            licenseId: lt.id,
            licenseCode: lt.code,
            licenseName: lt.name,
            penalty,
            reason: `Upcoming expiry: ${daysRemaining} day(s) remaining`,
            severity: 'MEDIUM',
            status: 'EXPIRING_SOON',
            daysRemaining,
            recommendation: `Prepare renewal filing for ${lt.name}.`,
          });
          suggestedActions.push(`Prepare renewal for ${lt.name} (expires in ${daysRemaining}d)`);
        } else {
          compliantCount++;
        }
      } else {
        // Missing expiry date on a non-lifetime license
        const penalty = 5.0;
        deductions.push({
          licenseId: lt.id,
          licenseCode: lt.code,
          licenseName: lt.name,
          penalty,
          reason: 'No expiry date recorded for date-bound license',
          severity: 'MEDIUM',
          status: 'MISSING_EXPIRY',
          recommendation: `Update document record with official expiry date.`,
        });
      }
    }

    // 4. Calculate Final Score (Clamped between 0 and 100)
    const totalPenalty = deductions.reduce((sum, d) => sum + d.penalty, 0);
    const rawScore = 100.0 - totalPenalty;
    const finalScore = Math.max(0.0, Math.min(100.0, Math.round(rawScore * 10) / 10));

    // Determine Health Status
    let healthStatus = 'COMPLIANT';
    if (finalScore < 60) {
      healthStatus = 'CRITICAL';
    } else if (finalScore < 85) {
      healthStatus = 'WARNING';
    }

    // 5. Structure Breakdown Payload
    const breakdown = {
      baseScore: 100.0,
      finalScore,
      healthStatus,
      calculatedAt: now.toISOString(),
      location: {
        id: location.id,
        name: location.name,
        code: location.code,
        type: location.type,
        state: location.state,
      },
      summary: {
        totalRequired: requiredLicenses.length,
        compliantCount,
        expiringSoonCount,
        expiredCount,
        missingCount,
        pendingVerificationCount,
        totalDeductions: totalPenalty,
      },
      deductions,
      suggestedActions,
    };

    // 6. Persist historical snapshot in compliance_scores and update location
    const [scoreRecord] = await Promise.all([
      prisma.complianceScore.create({
        data: {
          org_id: orgId,
          location_id: locationId,
          score: finalScore,
          breakdown_json: breakdown,
          calculated_at: now,
        },
      }),
      prisma.location.update({
        where: { id: locationId },
        data: { current_compliance_score: finalScore },
      }),
    ]);

    return {
      id: scoreRecord.id,
      score: finalScore,
      healthStatus,
      breakdown,
    };
  }

  /**
   * Recalculates scores for all locations belonging to an organization
   */
  async calculateOrganizationScore(orgId) {
    const locations = await prisma.location.findMany({
      where: { org_id: orgId },
      select: { id: true, name: true, code: true, type: true },
    });

    const locationScores = [];
    for (const loc of locations) {
      const res = await this.calculateLocationScore(loc.id, orgId);
      locationScores.push({
        locationId: loc.id,
        name: loc.name,
        code: loc.code,
        score: res.score,
        healthStatus: res.healthStatus,
      });
    }

    const avgScore = locationScores.length > 0
      ? Math.round((locationScores.reduce((acc, l) => acc + l.score, 0) / locationScores.length) * 10) / 10
      : 100.0;

    return {
      organizationId: orgId,
      averageScore: avgScore,
      locationCount: locations.length,
      locations: locationScores,
    };
  }

  /**
   * Get historical score timeline for a location (for frontend trend charts)
   */
  async getLocationHistory(locationId, orgId, limit = 30) {
    const location = await prisma.location.findFirst({
      where: { id: locationId, org_id: orgId },
      select: { id: true, name: true, code: true, current_compliance_score: true },
    });

    if (!location) {
      throw new NotFoundError(`Location not found`);
    }

    const history = await prisma.complianceScore.findMany({
      where: { location_id: locationId, org_id: orgId },
      orderBy: { calculated_at: 'desc' },
      take: Math.min(100, Math.max(1, parseInt(limit, 10))),
      select: {
        id: true,
        score: true,
        calculated_at: true,
        breakdown_json: true,
      },
    });

    return {
      location,
      currentScore: location.current_compliance_score,
      history: history.reverse(), // Chronological order for chart rendering
    };
  }

  /**
   * Get latest compliance breakdown for a location without forced recalculation
   */
  async getLocationLatestScore(locationId, orgId) {
    const latest = await prisma.complianceScore.findFirst({
      where: { location_id: locationId, org_id: orgId },
      orderBy: { calculated_at: 'desc' },
    });

    if (!latest) {
      // If no score recorded yet, compute it now
      return await this.calculateLocationScore(locationId, orgId);
    }

    return {
      id: latest.id,
      score: latest.score,
      calculatedAt: latest.calculated_at,
      breakdown: latest.breakdown_json,
    };
  }
}

module.exports = new ComplianceScoreService();
