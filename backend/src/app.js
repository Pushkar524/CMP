const express = require('express');
const cors = require('cors');

// Middleware & Handlers
const errorHandler = require('./middleware/errorHandler');

// Route Handlers
const authRoutes = require('./modules/auth/auth.routes');
const tenancyRoutes = require('./modules/tenancy/tenancy.routes');

const app = express();

// Global Middleware
app.use(cors());
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
