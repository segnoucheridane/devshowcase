const ApiError = require('../utils/ApiError');

const notFound = (req, res, next) => {
  const error = new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message    = err.message    || 'Something went wrong.';

  // PostgreSQL duplicate value (e.g. email already registered)
  if (err.code === '23505') {
    statusCode = 409;
    message    = 'This value already exists.';
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    statusCode = 400;
    message    = 'Related record does not exist.';
  }

  // JWT token is invalid
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message    = 'Invalid token. Please log in again.';
  }

  // JWT token has expired
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message    = 'Session has expired. Please log in again.';
  }

  if (process.env.NODE_ENV === 'development') {
    console.error(`[${statusCode}] ${message}`);
    console.error(err.stack);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = { notFound, errorHandler };
