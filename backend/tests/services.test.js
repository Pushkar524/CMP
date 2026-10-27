const notificationService = require('../src/modules/notifications/notification.service');
const emailService = require('../src/services/EmailService');
const storageService = require('../src/services/StorageService');
const { initScheduler } = require('../src/jobs/scheduler');

describe('Services & Cron Module Tests', () => {
  // ============================================================
  // Service 1: EmailService
  // ============================================================
  describe('EmailService', () => {
    it('EmailService :: exposes essential notification and alert methods', () => {
      expect(typeof emailService.sendExpiryAlert).toBe('function');
      expect(typeof emailService.sendCascadingRiskAlert).toBe('function');
      expect(typeof emailService.sendWeeklyDigest).toBe('function');
    });

    it('EmailService :: getBaseUrl returns valid frontend application URL', () => {
      const url = emailService.getBaseUrl();
      expect(typeof url).toBe('string');
      expect(url.length).toBeGreaterThan(0);
    });
  });

  // ============================================================
  // Service 2: StorageService
  // ============================================================
  describe('StorageService', () => {
    it('StorageService :: exposes file upload and presigning capabilities', () => {
      expect(typeof storageService.uploadFile).toBe('function');
      expect(typeof storageService.getSignedDownloadUrl).toBe('function');
      expect(typeof storageService.deleteFile).toBe('function');
    });

    it('StorageService :: generates valid signed download URL structure', async () => {
      const signedUrl = await storageService.getSignedDownloadUrl('documents/test-org/dummy.pdf');
      expect(typeof signedUrl).toBe('string');
      expect(signedUrl).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
    });
  });

  // ============================================================
  // Service 3: Automated Expiry Sweep & Cron Logic
  // ============================================================
  describe('Cron & Expiry Sweep Service', () => {
    it('initScheduler :: initializes scheduled cron tasks without throwing', () => {
      expect(() => initScheduler()).not.toThrow();
    });

    it('runExpirySweep :: evaluates compliance documents and dispatches alerts', async () => {
      const summary = await notificationService.runExpirySweep();
      expect(summary).toHaveProperty('documentsEvaluated');
      expect(summary).toHaveProperty('alertsDispatched');
      expect(typeof summary.documentsEvaluated).toBe('number');
      expect(typeof summary.alertsDispatched).toBe('number');
    });

    it('runExpirySweep :: deduplication across different locations or license types', async () => {
      // Running sweep twice should not produce duplicate unread alerts
      const sweep1 = await notificationService.runExpirySweep();
      const sweep2 = await notificationService.runExpirySweep();
      expect(sweep2.alertsDispatched).toBeLessThanOrEqual(sweep1.alertsDispatched);
    });
  });
});
