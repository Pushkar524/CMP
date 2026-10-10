const express = require('express');
const cors = require('cors');

// Middleware & Handlers
const errorHandler = require('./middleware/errorHandler');

// Route Handlers
const authRoutes = require('./modules/auth/auth.routes');
const tenancyRoutes = require('./modules/tenancy/tenancy.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');
const complianceRoutes = require('./modules/compliance/complianceScore.routes');
const intelligenceRoutes = require('./modules/intelligence/intelligence.routes');

const app = express();

// Global Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'SCLIP Core API',
  });
});

// Mount Module APIs
app.use('/api/auth', authRoutes);
app.use('/api/tenancy', tenancyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/intelligence', intelligenceRoutes);

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
