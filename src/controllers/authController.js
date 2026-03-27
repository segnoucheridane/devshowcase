const bcrypt        = require('bcryptjs');
const crypto        = require('crypto');
const { pool }      = require('../config/database');
const generateToken = require('../utils/generateToken');
const sendResponse  = require('../utils/sendResponse');
const ApiError      = require('../utils/ApiError');

const register = async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return next(new ApiError(400, 'Username, email and password are required.'));
    }

    if (password.length < 6) {
      return next(new ApiError(400, 'Password must be at least 6 characters.'));
    }

    const emailCheck = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (emailCheck.rows.length > 0) {
      return next(new ApiError(409, 'An account with this email already exists.'));
    }

    const usernameCheck = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    if (usernameCheck.rows.length > 0) {
      return next(new ApiError(409, 'This username is already taken.'));
    }

    const hashed     = await bcrypt.hash(password, 12);
    const safeRoles  = ['user', 'developer', 'investor', 'recruiter'];
    const userRole   = safeRoles.includes(role) ? role : 'developer';

    const result = await pool.query(
      `INSERT INTO users (username, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, role, is_verified, created_at`,
      [username, email.toLowerCase(), hashed, userRole]
    );

    const newUser = result.rows[0];
    const token   = generateToken(newUser.id);

    sendResponse(res, 201, newUser, 'Account created successfully.', { token });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new ApiError(400, 'Email and password are required.'));
    }

    const result = await pool.query(
      'SELECT id, username, email, password, role, is_active FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    const user = result.rows[0];

    if (!user) {
      return next(new ApiError(401, 'Invalid email or password.'));
    }

    if (!user.is_active) {
      return next(new ApiError(403, 'This account has been deactivated.'));
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return next(new ApiError(401, 'Invalid email or password.'));
    }

    delete user.password;

    const token = generateToken(user.id);

    sendResponse(res, 200, user, 'Login successful.', { token });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, role, bio, avatar, website, github,
              linkedin, skills, reputation_score, is_verified, created_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (!result.rows[0]) {
      return next(new ApiError(404, 'User not found.'));
    }

    sendResponse(res, 200, result.rows[0]);
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    sendResponse(res, 200, null, 'Logged out. Please remove the token on the client side.');
  } catch (err) {
    next(err);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const token = generateToken(req.user.id);
    sendResponse(res, 200, null, 'Token refreshed.', { token });
  } catch (err) {
    next(err);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(new ApiError(400, 'Email is required.'));
    }

    const result = await pool.query(
      'SELECT id FROM users WHERE email = $1 AND is_active = TRUE',
      [email.toLowerCase()]
    );

    const user = result.rows[0];

    // Always return the same message — do not reveal if the email exists
    if (!user) {
      return sendResponse(res, 200, null, 'If that email is registered, a reset link will be sent.');
    }

    const resetToken   = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

    await pool.query(
      'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
      [resetToken, resetExpires, user.id]
    );

    // In development: return token so you can test without email setup
    const data = process.env.NODE_ENV === 'development' ? { resetToken } : null;

    sendResponse(res, 200, data, 'If that email is registered, a reset link will be sent.');
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return next(new ApiError(400, 'Token and new password are required.'));
    }

    if (newPassword.length < 6) {
      return next(new ApiError(400, 'Password must be at least 6 characters.'));
    }

    const result = await pool.query(
      `SELECT id FROM users
       WHERE password_reset_token = $1
         AND password_reset_expires > NOW()
         AND is_active = TRUE`,
      [token]
    );

    const user = result.rows[0];

    if (!user) {
      return next(new ApiError(400, 'This reset token is invalid or has expired.'));
    }

    const hashed = await bcrypt.hash(newPassword, 12);

    await pool.query(
      `UPDATE users
       SET password = $1,
           password_reset_token = NULL,
           password_reset_expires = NULL,
           updated_at = NOW()
       WHERE id = $2`,
      [hashed, user.id]
    );

    sendResponse(res, 200, null, 'Password updated. You can now log in.');
  } catch (err) {
    next(err);
  }
};

const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return next(new ApiError(400, 'Verification token is required.'));
    }

    const result = await pool.query(
      'SELECT id FROM users WHERE email_verification_token = $1 AND is_active = TRUE',
      [token]
    );

    const user = result.rows[0];

    if (!user) {
      return next(new ApiError(400, 'Invalid verification token.'));
    }

    await pool.query(
      `UPDATE users
       SET is_verified = TRUE,
           email_verification_token = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [user.id]
    );

    sendResponse(res, 200, null, 'Email verified successfully.');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  getMe,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
};
