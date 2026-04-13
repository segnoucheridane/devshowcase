const sendResponse = require('../utils/sendResponse');
const ApiError = require('../utils/ApiError');
const notificationService = require('../services/notificationService');

/**
 * Get user's notifications
 */
const getNotifications = async (req, res, next) => {
  try {
    const { page, limit, unreadOnly } = req.query;
    const result = await notificationService.getUserNotifications(req.user.id, {
      page,
      limit,
      unreadOnly,
    });

    sendResponse(res, 200, result.notifications, null, {
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Mark notification as read
 */
const markAsRead = async (req, res, next) => {
  try {
    const { notification_id } = req.params;
    const notification = await notificationService.markAsRead(
      parseInt(notification_id),
      req.user.id
    );

    sendResponse(res, 200, notification, 'Notification marked as read');
  } catch (err) {
    if (err.message === 'Notification not found') {
      return next(new ApiError(404, err.message));
    }
    next(err);
  }
};

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllAsRead(req.user.id);
    sendResponse(res, 200, result, `${result.count} notification(s) marked as read`);
  } catch (err) {
    next(err);
  }
};

/**
 * Delete notification
 */
const deleteNotification = async (req, res, next) => {
  try {
    const { notification_id } = req.params;
    await notificationService.deleteNotification(parseInt(notification_id), req.user.id);

    sendResponse(res, 200, null, 'Notification deleted');
  } catch (err) {
    if (err.message === 'Notification not found') {
      return next(new ApiError(404, err.message));
    }
    next(err);
  }
};

/**
 * Get notification preferences
 */
const getPreferences = async (req, res, next) => {
  try {
    const preferences = await notificationService.getPreferences(req.user.id);
    sendResponse(res, 200, preferences);
  } catch (err) {
    next(err);
  }
};

/**
 * Update notification preferences
 */
const updatePreferences = async (req, res, next) => {
  try {
    const allowedFields = [
      'email_collaboration',
      'email_funding',
      'email_purchase',
      'push_collaboration',
      'push_funding',
      'push_purchase',
      'in_app_collaboration',
      'in_app_funding',
      'in_app_purchase',
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    const preferences = await notificationService.updatePreferences(req.user.id, updates);
    sendResponse(res, 200, preferences, 'Preferences updated');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getPreferences,
  updatePreferences,
};