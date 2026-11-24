const prisma = require('../../config/db');
const { NotFoundError } = require('../../utils/errors');
const intelligenceService = require('../intelligence/intelligence.service');

const roundOne = (value) => Math.round(value * 10) / 10;

function evaluateDocumentEvidence(doc, license, now) {
  if (!doc) {
    return {
      lossRatio: 1,
      status: 'MISSING',
      severity: 'CRITICAL',
      reason: 'Mandatory license document is missing',
      evidence: 'No document record exists for this mandatory license.',
    };
  }

  if (doc.status === 'REJECTED') {
    return {
      lossRatio: 0.80,
      status: 'REJECTED',
      severity: 'HIGH',
      reason: `Document was rejected: ${doc.rejection_reason || 'Failed compliance review'}`,
      evidence: doc.rejection_reason ? `Admin rejection reason: ${doc.rejection_reason}` : 'The latest document failed compliance review.',
    };
  }

  if (doc.status === 'PENDING_VERIFICATION') {
    return {
      lossRatio: 0.35,
      status: 'PENDING_VERIFICATION',
      severity: 'MEDIUM',
      reason: 'Document uploaded but awaiting verification',
      evidence: `Uploaded ${doc.created_at ? new Date(doc.created_at).toLocaleDateString() : 'on an unknown date'} and has not been approved by an administrator.`,
    };
  }

  if (license.is_lifetime_valid && doc.status === 'VERIFIED') {
    return {
      lossRatio: 0,
      status: 'VERIFIED',
      severity: 'NONE',
      reason: 'Lifetime-valid registration is verified',
      evidence: 'The document is administrator-verified and recorded as lifetime-valid.',
    };
  }

  if (!doc.expiry_date) {
    return {
      lossRatio: 0.25,
      status: 'MISSING_EXPIRY',
      severity: 'MEDIUM',
      reason: 'No expiry date recorded for a date-bound license',
      evidence: 'Validity cannot be evaluated because the official expiry date is absent.',
    };
  }

  const expiryDate = new Date(doc.expiry_date);
  const issueDate = doc.issue_date ? new Date(doc.issue_date) : null;
  const daysRemaining = Math.ceil((expiryDate.getTime() - now.getTime()) / 86400000);

  if (issueDate && (!isNaN(issueDate.getTime()) && issueDate.getTime() > expiryDate.getTime())) {
    return {
      lossRatio: 1,
      status: 'INVALID_DATE_RANGE',
      severity: 'CRITICAL',
      reason: 'Issue date occurs after the expiry date',
      evidence: `Issue date ${issueDate.toLocaleDateString()} is later than expiry date ${expiryDate.toLocaleDateString()}.`,
    };
  }

  if (daysRemaining <= 0 || doc.status === 'EXPIRED') {
    return {
      lossRatio: 1,
      status: 'EXPIRED',
      severity: 'CRITICAL',
      reason: `License expired on ${expiryDate.toLocaleDateString()}`,
      evidence: `Official expiry was ${Math.abs(daysRemaining)} day(s) ago${doc.verified_at ? `; last verification was ${new Date(doc.verified_at).toLocaleDateString()}` : ''}.`,
      daysRemaining,
    };
  }

  if (daysRemaining <= 7) {
    return {
      lossRatio: 0.55,
      status: 'EXPIRING_CRITICAL',
      severity: 'HIGH',
      reason: `Critical expiry: ${daysRemaining} day(s) remaining`,
      evidence: `Official expiry is ${expiryDate.toLocaleDateString()}, leaving only ${daysRemaining} day(s).`,
      daysRemaining,
    };
  }

  if (daysRemaining <= 30) {
    return {
      lossRatio: 0.30,
      status: 'EXPIRING_SOON',
      severity: 'MEDIUM',
      reason: `Upcoming expiry: ${daysRemaining} day(s) remaining`,
      evidence: `Official expiry is ${expiryDate.toLocaleDateString()}, within the 30-day renewal window.`,
      daysRemaining,
    };
  }

  if (daysRemaining <= 90) {
    return {
      lossRatio: 0.10,
      status: 'EXPIRY_WINDOW',
      severity: 'LOW',
      reason: `Renewal planning window: ${daysRemaining} day(s) remaining`,
      evidence: `Official expiry is ${expiryDate.toLocaleDateString()}, within the 90-day planning window.`,
      daysRemaining,
    };
  }

  return {
    lossRatio: 0,
    status: 'VERIFIED',
    severity: 'NONE',
    reason: 'Verified and valid',
    evidence: `Official expiry is ${expiryDate.toLocaleDateString()} (${daysRemaining} day(s) remaining).`,
    daysRemaining,
  };
}

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
    const requiredLicenses = location.type
      ? await prisma.requiredLicenseType.findMany({
        where: {
          location_type: location.type,
          is_mandatory: true,
          OR: [
            { state: null },
            ...(location.state ? [{ state: location.state }] : []),
          ],
        },
        include: {
          license_type: true,
        },
      })
      : [];

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
    let evidenceVerifiedCount = 0;
    let evidenceQualityLoss = 0;
    let licenseWeightLost = 0;

    // 3. Evaluate each required license type
    for (const req of requiredLicenses) {
      const lt = req.license_type;
      const doc = docMapByLicense.get(lt.id);
      const weight = requiredLicenses.length > 0 ? 100 / requiredLicenses.length : 0;
      const evaluation = evaluateDocumentEvidence(doc, lt, now);

      if (evaluation.status === 'MISSING') {
        missingCount++;
      } else if (evaluation.status === 'PENDING_VERIFICATION') {
        pendingVerificationCount++;
      } else if (evaluation.status === 'EXPIRED' || evaluation.status === 'INVALID_DATE_RANGE') {
        expiredCount++;
      } else if (evaluation.status.startsWith('EXPIR')) {
        expiringSoonCount++;
      } else if (evaluation.status === 'VERIFIED') {
        compliantCount++;
        evidenceVerifiedCount++;
      }

      if (evaluation.lossRatio > 0) {
        let penalty = roundOne(weight * evaluation.lossRatio);

        if (doc?.status === 'VERIFIED' && doc.verified_at) {
          const verificationAgeDays = Math.max(0, Math.ceil((now.getTime() - new Date(doc.verified_at).getTime()) / 86400000));
          if (verificationAgeDays > 365) {
            const stalePenalty = roundOne(weight * 0.05);
            penalty = roundOne(penalty + stalePenalty);
            evaluation.evidence += ` The latest verification is ${verificationAgeDays} days old and should be refreshed.`;
          }
        }

        deductions.push({
          licenseId: lt.id,
          licenseCode: lt.code,
          licenseName: lt.name,
          penalty,
          reason: evaluation.reason,
          evidence: evaluation.evidence,
          severity: evaluation.severity,
          status: evaluation.status,
          daysRemaining: evaluation.daysRemaining,
          recommendation: evaluation.status === 'MISSING'
            ? `Upload a valid ${lt.name} document issued by ${lt.issuing_authority || 'the competent authority'}, then obtain administrator verification.`
            : evaluation.status === 'REJECTED'
              ? `Correct the rejection issue and upload a revised ${lt.name} certificate for verification.`
              : evaluation.status === 'PENDING_VERIFICATION'
                ? `Complete administrator verification of ${doc.file_name}.`
                : evaluation.status === 'EXPIRED' || evaluation.status === 'INVALID_DATE_RANGE'
                  ? `Submit a renewed or correctly dated ${lt.name} certificate immediately.`
                  : `Update ${lt.name} details and prepare renewal evidence before the expiry deadline.`,
          issuingAuthority: lt.issuing_authority || null,
        });
        licenseWeightLost += penalty;
        evidenceQualityLoss += weight * evaluation.lossRatio;
        suggestedActions.push(`${evaluation.status === 'MISSING' ? 'Upload' : 'Resolve'} ${lt.name}: ${evaluation.reason}`);
      }
    }

    // 3.5. Evaluate Cascading Dependency Failures via Intelligence Engine
    const graphData = await intelligenceService.getLocationDependencyGraph(locationId, orgId);

    // Group active risk chains by target license to prevent duplicate risk items
    const chainsByTarget = new Map();
    for (const chain of (graphData.activeRiskChains || [])) {
      if (!chainsByTarget.has(chain.targetCode)) {
        chainsByTarget.set(chain.targetCode, []);
      }
      chainsByTarget.get(chain.targetCode).push(chain);
    }

    let cascadingBlockedCount = chainsByTarget.size;

    for (const [targetCode, chains] of chainsByTarget.entries()) {
      const targetLicense = chains[0].targetLicense;
      const targetRule = requiredLicenses.find((req) => req.license_type?.code === targetCode);
      const targetWeight = requiredLicenses.length > 0
        ? 100 / requiredLicenses.length
        : 10;
      const penalty = roundOne(targetRule ? targetWeight * 0.35 : 10);
      const blockerNames = chains.map((c) => c.blockedByName);
      const isPlural = blockerNames.length > 1;

      const cleanReasons = chains.map((c) => (c.reason || 'Missing').replace(/^prerequisite\s+/i, '').toLowerCase());
      const reasonSuffix = isPlural
        ? `prerequisites (${blockerNames.join(', ')}) are missing or expired`
        : `prerequisite (${blockerNames[0]}) is ${cleanReasons[0]}`;

      const reason = `Cascading Risk: Downstream operations blocked because ${reasonSuffix}`;

      const recommendation = isPlural
        ? `Renew or upload required prerequisites (${blockerNames.join(', ')}) to unblock statutory compliance for ${targetLicense}.`
        : chains[0].recommendation;

      const existingDeduction = deductions.find((d) => d.licenseCode === targetCode);
      if (existingDeduction) {
        existingDeduction.cascadingNote = reason;
        existingDeduction.reason = `${existingDeduction.reason}; ${reason}`;
        existingDeduction.evidence = `${existingDeduction.evidence || ''} Cascading evidence: ${reasonSuffix}.`;
        existingDeduction.penalty = roundOne(Math.max(existingDeduction.penalty, penalty));
      } else {
        deductions.push({
          licenseCode: targetCode,
          licenseName: targetLicense,
          penalty,
          reason,
          evidence: `Dependency evidence: ${reasonSuffix}.`,
          severity: 'CRITICAL',
          status: 'CASCADING_BLOCKED',
          recommendation,
        });
      }

      suggestedActions.push(
        `Resolve upstream block${isPlural ? 's' : ''}: ${blockerNames.join(', ')} to unblock ${targetLicense} (+${penalty.toFixed(1)} pts)`
      );
    }

    const isProfileComplete = Boolean(
      location.profile_completed ||
      (location.type && location.state && location.address)
    );
    const profileFields = [
      location.type,
      location.state,
      location.address,
      location.city,
      location.pincode,
      location.phone,
    ];
    const profileCompleteness = profileFields.filter(Boolean).length / profileFields.length;
    const profilePenalty = isProfileComplete ? 0 : roundOne((1 - profileCompleteness) * 10);

    if (!isProfileComplete) {
      suggestedActions.unshift('Complete the location profile before uploading compliance documents.');
    }

    // 4. Calculate Final Score (Clamped between 0 and 100)
    const totalPenalty = roundOne(deductions.reduce((sum, d) => sum + d.penalty, 0) + profilePenalty);
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
      methodology: {
        model: 'Evidence-weighted compliance index',
        formula: '100 - mandatory-license evidence losses - dependency-chain losses - profile completeness loss',
        metrics: [
          'Mandatory requirement coverage',
          'Document verification status',
          'Expiry and renewal window',
          'Issue-to-expiry date validity',
          'Document verification age',
          'Blocking prerequisite dependencies',
          'Location profile completeness',
        ],
        scoreScale: {
          compliant: '85-100',
          warning: '60-84.9',
          critical: '0-59.9',
        },
      },
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
        cascadingBlockedCount,
        totalDeductions: totalPenalty,
        evidenceVerifiedCount,
        evidenceQualityLoss: roundOne(evidenceQualityLoss),
        licenseWeightLost: roundOne(licenseWeightLost),
        profileCompleteness: roundOne(profileCompleteness * 100),
        profilePenalty,
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
   * Recalculates scores for all locations belonging to an organization with behind-the-scenes AI insights
   */
  async calculateOrganizationScore(orgId) {
    const locations = await prisma.location.findMany({
      where: { org_id: orgId },
      select: { id: true, name: true, code: true, type: true, state: true },
    });

    const locationScores = [];
    const allDeductions = [];
    const allActions = [];
    let totalCompliant = 0;
    let totalMissing = 0;
    let totalRequired = 0;

    const results = await Promise.all(
      locations.map(async (loc) => {
        const res = await this.calculateLocationScore(loc.id, orgId);
        return { loc, res };
      })
    );

    for (const { loc, res } of results) {
      locationScores.push({
        locationId: loc.id,
        name: loc.name,
        code: loc.code,
        type: loc.type,
        state: loc.state,
        score: res.score,
        healthStatus: res.healthStatus,
        breakdown: res.breakdown,
      });

      if (res.breakdown) {
        totalCompliant += res.breakdown.summary?.compliantCount || 0;
        totalMissing += res.breakdown.summary?.missingCount || 0;
        totalRequired += res.breakdown.summary?.totalRequired || 0;
        if (Array.isArray(res.breakdown.deductions)) {
          allDeductions.push(...res.breakdown.deductions.map(d => ({ ...d, locationName: loc.name })));
        }
        if (Array.isArray(res.breakdown.suggestedActions)) {
          allActions.push(...res.breakdown.suggestedActions.map(a => `${loc.name}: ${a}`));
        }
      }
    }

    const avgScore = locationScores.length > 0
      ? Math.round((locationScores.reduce((acc, l) => acc + l.score, 0) / locationScores.length) * 10) / 10
      : 100.0;

    return {
      organizationId: orgId,
      averageScore: avgScore,
      locationCount: locations.length,
      locations: locationScores,
      breakdown: {
        baseScore: 100.0,
        finalScore: avgScore,
        healthStatus: avgScore < 60 ? 'CRITICAL' : avgScore < 85 ? 'WARNING' : 'COMPLIANT',
        location: {
          id: 'all',
          name: 'Overall Footprint (All Facilities)',
          type: 'Enterprise Portfolio',
          state: 'All Jurisdictions',
        },
        summary: {
          totalRequired,
          compliantCount: totalCompliant,
          missingCount: totalMissing,
          totalLocations: locations.length,
        },
        deductions: allDeductions,
        suggestedActions: allActions,
      },
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
