const prisma = require('../../../config/db');
const notificationService = require('../notification.service');

/**
 * Sweeps active documents for expiry warnings, lapsed licenses, and cascading dependency risk
 * @returns {Promise<object>} Execution summary
 */
async function runExpirySweep() {
  console.log('[ExpiryScheduler] ⏰ Starting automated expiry & cascading risk sweep...');
  const now = new Date();

  let warningsDispatched = 0;
  let lapsedUpdated = 0;
  let cascadingAlertsDispatched = 0;

  // 1. Fetch all documents that have an expiry_date and are not already rejected
  const documents = await prisma.document.findMany({
    where: {
      expiry_date: { not: null },
      status: { in: ['VERIFIED', 'PENDING_VERIFICATION'] },
    },
    include: {
      license_type: true,
      location: true,
      organization: {
        include: {
          users: true,
        },
      },
    },
  });

  // 2. Fetch all dependencies
  const dependencies = await prisma.dependency.findMany({
    where: { is_blocking: true },
    include: {
      license_type: true,
      prerequisite_license_type: true,
    },
  });

  // Group documents by location
  const locDocMap = new Map();
  for (const doc of documents) {
    const locKey = doc.location_id || 'org-wide';
    if (!locDocMap.has(locKey)) {
      locDocMap.set(locKey, []);
    }
    locDocMap.get(locKey).push(doc);
  }

  // 3. Evaluate Document Expiries
  for (const doc of documents) {
    const expDate = new Date(doc.expiry_date);
    const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Target stakeholders: Location Managers for this branch + Org Admins
    const relevantUsers = doc.organization.users.filter(
      (u) => u.role === 'ORG_ADMIN' // Admins always get alerts
    );

    // If document expired
    if (diffDays <= 0) {
      await prisma.document.update({
        where: { id: doc.id },
        data: { status: 'EXPIRED' },
      });
      lapsedUpdated++;

      for (const user of relevantUsers) {
        await notificationService.dispatchAlert({
          orgId: doc.org_id,
          userId: user.id,
          alertType: 'LAPSED_LICENSE',
          recipientEmail: user.email,
          subject: `🚨 LAPSED LICENSE: ${doc.license_type.name}`,
          content: `The license '${doc.license_type.name}' for location '${
            doc.location?.name || 'Organization-wide'
          }' expired on ${expDate.toLocaleDateString()}. Please submit a renewal immediately.`,
        });
      }
    }
    // If approaching expiry (within 30 days)
    else if (diffDays <= 30 && doc.status === 'VERIFIED') {
      warningsDispatched++;
      for (const user of relevantUsers) {
        await notificationService.dispatchAlert({
          orgId: doc.org_id,
          userId: user.id,
          alertType: 'EXPIRY_WARNING',
          recipientEmail: user.email,
          subject: `⚠️ RENEWAL REMINDER: ${doc.license_type.name} (${diffDays} days remaining)`,
          content: `The license '${doc.license_type.name}' for location '${
            doc.location?.name || 'Organization-wide'
          }' will expire on ${expDate.toLocaleDateString()} (${diffDays} days left).`,
        });
      }
    }
  }

  // 4. Evaluate Cascading Dependency Risk
  for (const dep of dependencies) {
    // Check across each location
    for (const [locKey, docs] of locDocMap.entries()) {
      const prereqDoc = docs.find((d) => d.license_type_id === dep.prerequisite_license_type_id);
      const dependentDoc = docs.find((d) => d.license_type_id === dep.license_type_id);

      const isPrereqLapsed =
        !prereqDoc ||
        prereqDoc.status === 'EXPIRED' ||
        (prereqDoc.expiry_date && new Date(prereqDoc.expiry_date) <= now);

      if (isPrereqLapsed && dependentDoc && dependentDoc.status === 'VERIFIED') {
        cascadingAlertsDispatched++;
        const orgAdmins = dependentDoc.organization.users.filter((u) => u.role === 'ORG_ADMIN');

        for (const admin of orgAdmins) {
          await notificationService.dispatchAlert({
            orgId: dependentDoc.org_id,
            userId: admin.id,
            alertType: 'CASCADING_RISK',
            recipientEmail: admin.email,
            subject: `⚡ CASCADING RISK: ${dependentDoc.license_type.name} Invalidated`,
            content: `CRITICAL: The prerequisite license '${dep.prerequisite_license_type.name}' is lapsed/missing for location '${
              dependentDoc.location?.name || 'Organization'
            }'. This legally invalidates the downstream license '${
              dependentDoc.license_type.name
            }'. Renew the prerequisite to clear this cascading risk.`,
          });
        }
      }
    }
  }

  console.log(
    `[ExpiryScheduler] ✅ Sweep completed: ${warningsDispatched} warnings, ${lapsedUpdated} lapsed, ${cascadingAlertsDispatched} cascading risks.`
  );

  return {
    success: true,
    totalDocumentsEvaluated: documents.length,
    warningsDispatched,
    lapsedUpdated,
    cascadingAlertsDispatched,
    completedAt: new Date().toISOString(),
  };
}

module.exports = {
  runExpirySweep,
};
