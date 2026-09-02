const { AppError } = require('../utils/errors');
const config = require('../config/env');

/**
 * Global Error Handler Middleware
 */
function errorHandler(err, req, res, next) {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // Handle Prisma Known Request Errors
  if (err.code === 'P2002') {
    const fields = err.meta?.target ? err.meta.target.join(', ') : 'field';
    error = new AppError(`A record with this ${fields} already exists.`, 409);
  } else if (err.code === 'P2025') {
    error = new AppError('The requested record was not found.', 404);
  } else if (err.code === 'P2003') {
    error = new AppError('Foreign key constraint failed. Referenced record does not exist.', 400);
  }

  // Handle JWT Errors
  if (err.name === 'JsonWebTokenError') {
    error = new AppError('Invalid authentication token. Please log in again.', 401);
  } else if (err.name === 'TokenExpiredError') {
    error = new AppError('Your session has expired. Please log in again.', 401);
  }

  // Handle Multer Errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new AppError('Uploaded file is too large. Maximum size allowed is 20MB.', 400);
  }

  const statusCode = error.statusCode || 500;
  const status = error.status || 'error';

  if (statusCode === 500 && config.nodeEnv === 'development') {
    console.error('[Unhandled Server Error]', err);
  }

  res.status(statusCode).json({
    success: false,
    status,
    message: error.message || 'Internal Server Error',
    details: error.details || null,
    ...(config.nodeEnv === 'development' && { stack: error.stack }),
  });
}

module.exports = errorHandler;
