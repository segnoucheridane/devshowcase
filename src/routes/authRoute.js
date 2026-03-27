const express = require('express');

const router = express.Router();

const { protect }     = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

const {
  register,
  login,
  getMe,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
} = require('../controllers/authController');

router.post('/register',        authLimiter, register);
router.post('/login',           authLimiter, login);
router.post('/verify-email',               verifyEmail);
router.post('/forgotpassword',             forgotPassword);
router.put('/resetpassword',               resetPassword);

router.get('/me',       protect, getMe);
router.post('/logout',  protect, logout);
router.post('/refresh', protect, refreshToken);

module.exports = router;
