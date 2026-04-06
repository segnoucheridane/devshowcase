const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');

const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getPreferences,
  updatePreferences,
} = require('../controllers/notificationController');

// All notification routes require authentication
router.use(protect);

// Notification CRUD
router.get('/', getNotifications);
router.put('/read-all', markAllAsRead);
router.put('/:notification_id/read', markAsRead);
router.delete('/:notification_id', deleteNotification);

// Notification preferences
router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);

module.exports = router;