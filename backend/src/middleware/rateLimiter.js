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

module.exports = {
  authLimiter,
  apiLimiter,
};
