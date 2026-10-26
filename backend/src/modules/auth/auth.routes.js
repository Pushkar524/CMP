const express = require('express');
const authController = require('./auth.controller');
const { authenticateJWT } = require('../../middleware/auth');
const { tenantScope } = require('../../middleware/tenantScope');
const { authLimiter } = require('../../middleware/rateLimiter');
const { validate } = require('../../middleware/validate');
const { loginSchema, registerSchema, changePasswordSchema } = require('./auth.schema');

const router = express.Router();

// Public Routes with rate limiting and schema validation
router.post('/login', authLimiter, validate(loginSchema), (req, res, next) =>
  authController.login(req, res, next)
);
router.post('/register', authLimiter, validate(registerSchema), (req, res, next) =>
  authController.register(req, res, next)
);

// Protected Routes
router.get('/me', authenticateJWT, tenantScope, (req, res, next) =>
  authController.me(req, res, next)
);
router.post('/change-password', authenticateJWT, validate(changePasswordSchema), (req, res, next) =>
  authController.changePassword(req, res, next)
);

module.exports = router;
