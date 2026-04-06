const express = require('express');
const router = express.Router();

const { protect, optionalAuth } = require('../middleware/auth');

const {
  searchProjects,
  getFilterOptions,
  getTrendingProjects,
  getPersonalizedRecommendations,
  getCategories,
  getTrendingTags,
} = require('../controllers/searchController');

// Public routes
router.get('/', optionalAuth, searchProjects);
router.get('/filters', getFilterOptions);
router.get('/trending', getTrendingProjects);
router.get('/categories', getCategories);
router.get('/tags/trending', getTrendingTags);

// Authenticated routes (personalized)
router.get('/for-you', protect, getPersonalizedRecommendations);

module.exports = router;