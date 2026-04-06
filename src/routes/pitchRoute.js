const express = require('express');
const router = express.Router();

const { protect, optionalAuth } = require('../middleware/auth');

const {
  createPitch,
  getPitch,
  updatePitch,
  addMarketAnalysis,
  addRoadmap,
  addRevenueModel,
  exportPitchPDF,
  togglePitchVisibility,
} = require('../controllers/pitchController');

// Public routes (read-only)
router.get('/projects/:project_id/pitch', optionalAuth, getPitch);

// Protected routes (owner only)
router.post('/projects/:project_id/pitch', protect, createPitch);
router.put('/projects/:project_id/pitch', protect, updatePitch);
router.post('/projects/:project_id/pitch/market-analysis', protect, addMarketAnalysis);
router.post('/projects/:project_id/pitch/roadmap', protect, addRoadmap);
router.post('/projects/:project_id/pitch/revenue-model', protect, addRevenueModel);
router.get('/projects/:project_id/pitch/export/pdf', protect, exportPitchPDF);
router.put('/projects/:project_id/pitch/visibility', protect, togglePitchVisibility);

module.exports = router;