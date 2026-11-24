const rateLimit = require('express-rate-limit');

// Authentication endpoints limiter (prevent brute force on login/register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: 'fail',
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes.',
  },
  skip: () => process.env.NODE_ENV === 'test', // Do not rate limit in automated test runs
});

// General API request limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    status: 'fail',
    message: 'Too many requests from this IP, please try again later.',
  },
  skip: () => process.env.NODE_ENV === 'test',
});

// Audit link PIN protection rate limiter (prevent brute forcing PINs)
const auditLinkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per IP/token
  standardHeaders: true,
  legacyHeaders: false,
  validate: { ip: false, keyGeneratorIpFallback: false },
  message: {
    success: false,
    status: 'fail',
    message: 'Too many PIN verification attempts for this audit link, please try again later.',
  },
  keyGenerator: (req) => `${req.ip}_${req.params.token || 'general'}`,
});

module.exports = {
  authLimiter,
  apiLimiter,
  auditLinkLimiter,
};
