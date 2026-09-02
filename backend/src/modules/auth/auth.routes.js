const express = require('express');
const authController = require('./auth.controller');
const { authenticateJWT } = require('../../middleware/auth');
const { tenantScope } = require('../../middleware/tenantScope');

const router = express.Router();

// Public Routes
router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/register', (req, res, next) => authController.register(req, res, next));

// Protected Routes
router.get('/me', authenticateJWT, tenantScope, (req, res, next) =>
  authController.me(req, res, next)
);
router.post('/change-password', authenticateJWT, (req, res, next) =>
  authController.changePassword(req, res, next)
);

module.exports = router;
