const jwt      = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const { pool } = require('../config/database');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new ApiError(401, 'Access denied. Please log in.'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query(
      'SELECT id, username, email, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    const user = result.rows[0];

    if (!user) {
      return next(new ApiError(401, 'User no longer exists.'));
    }

    if (!user.is_active) {
      return next(new ApiError(403, 'Your account has been deactivated.'));
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, `Role '${req.user.role}' is not allowed to perform this action.`));
    }
    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query(
      'SELECT id, username, email, role, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    const user = result.rows[0];

    if (user && user.is_active) {
      req.user = user;
    }
  } catch (_) {
    // token invalid or expired — just continue without a user
  }

  next();
};

module.exports = { protect, authorize, optionalAuth };
