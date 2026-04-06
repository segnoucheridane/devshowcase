const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

const {
  getViewAnalytics,
  getDemoInteractionAnalytics,
  getEngagementMetrics,
  getTimelineInsights,
  getUserAnalyticsSummary,
  exportAnalytics,
} = require('../controllers/analyticsController');

// All analytics routes require authentication
router.use(protect);

// Project-level analytics (owner only)
router.get('/projects/:project_id/views', getViewAnalytics);
router.get('/projects/:project_id/demo-interactions', getDemoInteractionAnalytics);
router.get('/projects/:project_id/engagement', getEngagementMetrics);
router.get('/projects/:project_id/timeline-insights', getTimelineInsights);

// User-level analytics
router.get('/user/overview', getUserAnalyticsSummary);
router.get('/export', exportAnalytics);

module.exports = router;