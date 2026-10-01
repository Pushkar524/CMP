const cron = require('node-cron');
const prisma = require('../../../config/db');
const emailService = require('../../../services/EmailService');
const smsService = require('../../../services/SmsService');
const notificationService = require('../notification.service');

/**
 * Runs a complete sweep over all documents to identify:
 * 1. Imminent expiries (<= 30 days)
 * 2. Lapsed licenses (<= 0 days)
 * 3. Cascading risk chains (downstream licenses blocked by lapsed prerequisites)
 */
async function runExpirySweep() {
  console.log('[Scheduler] ⏰ Starting automated expiry & cascading risk sweep...');
  const now = new Date();
  const warningWindow = new Date();
  warningWindow.setDate(warningWindow.getDate() + 30);

  try {
    // 1. Fetch all non-rejected documents
    const documents = await prisma.document.findMany({
      where: {
        status: { in: ['VERIFIED', 'PENDING_VERIFICATION'] },
        expiry_date: { not: null },
      },
      include: {
        organization: true,
        location: true,
        license_type: true,
      },
    });

    // 2. Fetch all dependencies
    const dependencies = await prisma.dependency.findMany({
      include: {
        license_type: true,
        prerequisite_license_type: true,
      },
    });

    const lapsedPrereqTypeIds = new Set();

    for (const doc of documents) {
      const daysLeft = Math.ceil(
        (new Date(doc.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Check for Lapsed License
      if (daysLeft < 0) {
        // Update document status to EXPIRED
        if (doc.status !== 'EXPIRED') {
          await prisma.document.update({
            where: { id: doc.id },
            data: { status: 'EXPIRED' },
          });
        }
        lapsedPrereqTypeIds.add(doc.license_type_id);

        await dispatchAlert({
          orgId: doc.org_id,
          locationId: doc.location_id,
          locationName: doc.location?.name || 'Org-Wide',
          licenseName: doc.license_type.name,
          alertType: 'LAPSED_LICENSE',
          title: `⚠️ URGENT: ${doc.license_type.name} Has Expired`,
          details: `The regulatory license for ${doc.location?.name || 'the organization'} lapsed on ${new Date(doc.expiry_date).toLocaleDateString()}. Immediate renewal is legally required.`,
        });
      }
      // Check for 30-Day Expiry Warning
      else if (daysLeft <= 30) {
        await dispatchAlert({
          orgId: doc.org_id,
          locationId: doc.location_id,
          locationName: doc.location?.name || 'Org-Wide',
          licenseName: doc.license_type.name,
          alertType: 'EXPIRY_WARNING',
          daysLeft,
          title: `⏳ Renewal Notice: ${doc.license_type.name} Expiring in ${daysLeft} Days`,
          details: `Statutory license expires on ${new Date(doc.expiry_date).toLocaleDateString()}. Please initiate the renewal application before the deadline to prevent compliance lapse.`,
        });
      }
    }

    // 3. Check for Cascading Risks
    for (const dep of dependencies) {
      if (lapsedPrereqTypeIds.has(dep.prerequisite_license_type_id)) {
        // Find documents that depend on this lapsed prerequisite
        const dependentDocs = documents.filter(
          (d) => d.license_type_id === dep.license_type_id
        );

        for (const depDoc of dependentDocs) {
          await dispatchAlert({
            orgId: depDoc.org_id,
            locationId: depDoc.location_id,
            locationName: depDoc.location?.name || 'Org-Wide',
            licenseName: depDoc.license_type.name,
            alertType: 'CASCADING_RISK',
            title: `🔗 Cascading Compliance Risk: ${depDoc.license_type.name}`,
            details: `Statutory validity of ${depDoc.license_type.name} is jeopardized because prerequisite license '${dep.prerequisite_license_type.name}' has lapsed!`,
          });
        }
      }
    }

    console.log('[Scheduler] ✅ Expiry & risk sweep completed successfully.');
  } catch (err) {
    console.error('[Scheduler] ❌ Error during expiry sweep:', err);
  }
}

/**
 * Dispatches an alert across in-app, email, and SMS channels
 * respecting each recipient's notification preferences.
 */
async function dispatchAlert({ orgId, locationId, locationName, licenseName, alertType, title, details, daysLeft }) {
  // Find recipient users: Org Admins + Assigned Location Managers
  const whereUsers = {
    org_id: orgId,
    OR: [
      { role: 'ORG_ADMIN' },
      ...(locationId
        ? [
            {
              role: 'LOCATION_MANAGER',
              user_location_access: {
                some: { location_id: locationId },
              },
            },
          ]
        : []),
    ],
  };

  const users = await prisma.user.findMany({
    where: whereUsers,
    include: {
      notification_preferences: {
        where: { alert_type: alertType },
      },
    },
  });

  for (const user of users) {
    const pref = user.notification_preferences[0] || {
      email_enabled: true,
      sms_enabled: false,
      in_app_enabled: true,
    };

    const contentSummary = `${title} — ${locationName}`;

    // 1. In-App Channel
    if (pref.in_app_enabled) {
      await notificationService.logNotification({
        orgId,
        userId: user.id,
        type: alertType,
        channel: 'IN_APP',
        recipient: user.email,
        content: `${title}: ${details}`,
      });
    }

    // 2. Email Channel
    if (pref.email_enabled) {
      const html = emailService.buildAlertTemplate({
        title,
        alertType,
        locationName,
        licenseName,
        details,
        daysLeft,
      });

      await emailService.sendEmail({
        to: user.email,
        subject: `[SCLIP Alert] ${title}`,
        html,
      });

      await notificationService.logNotification({
        orgId,
        userId: user.id,
        type: alertType,
        channel: 'EMAIL',
        recipient: user.email,
        content: contentSummary,
      });
    }

    // 3. SMS Channel
    if (pref.sms_enabled) {
      const smsText = `SCLIP Alert: ${title} for ${locationName}. Details: ${details.slice(0, 100)}...`;
      await smsService.sendSms({
        to: '+919999999999', // User phone or fallback
        message: smsText,
      });

      await notificationService.logNotification({
        orgId,
        userId: user.id,
        type: alertType,
        channel: 'SMS',
        recipient: user.email,
        content: smsText,
      });
    }
  }
}

/**
 * Initializes and schedules the automated daily background job
 */
function startExpiryScheduler(cronExpression = '0 1 * * *') {
  console.log(`[Scheduler] ⏰ Registering Expiry Sweep Cron Job: '${cronExpression}'`);
  return cron.schedule(cronExpression, async () => {
    await runExpirySweep();
  });
}

module.exports = {
  startExpiryScheduler,
  runExpirySweep,
};
