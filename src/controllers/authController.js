const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const generateToken = require('../utils/generateToken');
const sendResponse = require('../utils/sendResponse');
const ApiError = require('../utils/ApiError');
const { prisma } = require('../config/prisma');
const userService = require('../services/UserService');

const register = async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return next(new ApiError(400, 'Username, email and password are required.'));
    }

    if (password.length < 6) {
      return next(new ApiError(400, 'Password must be at least 6 characters.'));
    }

    // Check if email exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (existingEmail) {
      return next(new ApiError(409, 'An account with this email already exists.'));
    }

    // Check if username exists
    const existingUsername = await prisma.user.findUnique({
      where: { username }
    });
    
    if (existingUsername) {
      return next(new ApiError(409, 'This username is already taken.'));
    }

    const hashed = await bcrypt.hash(password, 12);
    const safeRoles = ['user', 'developer', 'investor', 'recruiter'];
    const userRole = safeRoles.includes(role) ? role : 'developer';

    const newUser = await prisma.user.create({
      data: {
        username,
        email: email.toLowerCase(),
        password: hashed,
        role: userRole,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        is_verified: true,
        created_at: true,
      }
    });

    const token = generateToken(newUser.id);
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

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        username: true,
        email: true,
        password: true,
        role: true,
        is_active: true,
      }
    });

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
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        bio: true,
        avatar: true,
        website: true,
        github: true,
        linkedin: true,
        skills: true,
        reputation_score: true,
        is_verified: true,
        created_at: true,
      }
    });

    if (!user) {
      return next(new ApiError(404, 'User not found.'));
    }

    sendResponse(res, 200, user);
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

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase(), is_active: true },
      select: { id: true }
    });

    if (!user) {
      return sendResponse(res, 200, null, 'If that email is registered, a reset link will be sent.');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password_reset_token: resetToken,
        password_reset_expires: resetExpires,
      }
    });

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

    const user = await prisma.user.findFirst({
      where: {
        password_reset_token: token,
        password_reset_expires: { gt: new Date() },
        is_active: true,
      },
      select: { id: true }
    });

    if (!user) {
      return next(new ApiError(400, 'This reset token is invalid or has expired.'));
    }

    const hashed = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashed,
        password_reset_token: null,
        password_reset_expires: null,
      }
    });

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

    const user = await prisma.user.findFirst({
      where: {
        email_verification_token: token,
        is_active: true,
      },
      select: { id: true }
    });

    if (!user) {
      return next(new ApiError(400, 'Invalid verification token.'));
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        is_verified: true,
        email_verification_token: null,
      }
    });

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