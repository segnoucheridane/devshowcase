const sendResponse = require('../utils/sendResponse');
const ApiError = require('../utils/ApiError');
const analyticsService = require('../services/analyticsService');

/**
 * Get view count analytics
 */
const getViewAnalytics = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const analytics = await analyticsService.getViewAnalytics(
      parseInt(project_id),
      req.user.id
    );
    sendResponse(res, 200, analytics);
  } catch (err) {
    if (err.message === 'Project not found') {
      return next(new ApiError(404, err.message));
    }
    if (err.message === 'You do not own this project') {
      return next(new ApiError(403, err.message));
    }
    next(err);
  }
};

/**
 * Get demo interaction analytics
 */
const getDemoInteractionAnalytics = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const analytics = await analyticsService.getDemoInteractionAnalytics(
      parseInt(project_id),
      req.user.id
    );
    sendResponse(res, 200, analytics);
  } catch (err) {
    if (err.message === 'Project not found') {
      return next(new ApiError(404, err.message));
    }
    if (err.message === 'You do not own this project') {
      return next(new ApiError(403, err.message));
    }
    next(err);
  }
};

/**
 * Get engagement metrics
 */
const getEngagementMetrics = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const metrics = await analyticsService.getEngagementMetrics(
      parseInt(project_id),
      req.user.id
    );
    sendResponse(res, 200, metrics);
  } catch (err) {
    if (err.message === 'Project not found') {
      return next(new ApiError(404, err.message));
    }
    if (err.message === 'You do not own this project') {
      return next(new ApiError(403, err.message));
    }
    next(err);
  }
};

/**
 * Get timeline insights
 */
const getTimelineInsights = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const insights = await analyticsService.getTimelineInsights(
      parseInt(project_id),
      req.user.id
    );
    sendResponse(res, 200, insights);
  } catch (err) {
    if (err.message === 'Project not found') {
      return next(new ApiError(404, err.message));
    }
    if (err.message === 'You do not own this project') {
      return next(new ApiError(403, err.message));
    }
    next(err);
  }
};

/**
 * Get user analytics summary
 */
const getUserAnalyticsSummary = async (req, res, next) => {
  try {
    const summary = await analyticsService.getUserAnalyticsSummary(req.user.id);
    sendResponse(res, 200, summary);
  } catch (err) {
    next(err);
  }
};

/**
 * Export analytics report
 */
const exportAnalytics = async (req, res, next) => {
  try {
    const { format = 'csv' } = req.query;
    const result = await analyticsService.exportAnalytics(req.user.id, format);
    
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
    res.send(result.data);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getViewAnalytics,
  getDemoInteractionAnalytics,
  getEngagementMetrics,
  getTimelineInsights,
  getUserAnalyticsSummary,
  exportAnalytics,
};