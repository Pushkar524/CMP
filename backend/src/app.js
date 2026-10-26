const express = require('express');
const cors = require('cors');

const helmet = require('helmet');
const prisma = require('./config/db');
const storageService = require('./services/StorageService');

// Middleware & Handlers
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

// Route Handlers
const authRoutes        = require('./modules/auth/auth.routes');
const tenancyRoutes     = require('./modules/tenancy/tenancy.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');
const complianceRoutes  = require('./modules/compliance/complianceScore.routes');
const intelligenceRoutes = require('./modules/intelligence/intelligence.routes');
const documentRoutes    = require('./modules/documents/document.routes');
const auditLinkRoutes   = require('./modules/auditLinks/auditLink.routes');

const app = express();

// Security Headers & Global Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Route with live DB and Storage verification
app.get('/health', async (req, res) => {
  let dbStatus = 'UP';
  let storageStatus = 'UP';

  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err) {
    dbStatus = 'DOWN';
  }

  try {
    const storageRes = await storageService.checkHealth();
    storageStatus = storageRes.status;
  } catch (err) {
    storageStatus = 'DOWN';
  }

  const isHealthy = dbStatus === 'UP';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'UP' : 'DOWN',
    timestamp: new Date().toISOString(),
    service: 'Compliance Management Platform API',
    checks: {
      database: dbStatus,
      storage: storageStatus,
    },
  });
});

// General API Rate Limiting
app.use('/api', apiLimiter);

// Mount Module APIs
app.use('/api/auth',          authRoutes);
app.use('/api/tenancy',       tenancyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/compliance',    complianceRoutes);
app.use('/api/intelligence',  intelligenceRoutes);
app.use('/api/documents',     documentRoutes);
app.use('/api/audit-links',   auditLinkRoutes);

// 404 Catch-All Handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    status: 'fail',
    message: `Cannot ${req.method} ${req.originalUrl} - Endpoint not found`,
  });
});

// Centralized Error Handler Middleware
app.use(errorHandler);

module.exports = app;
