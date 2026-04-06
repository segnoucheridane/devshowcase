const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

const {
  createTutorial,
  getTutorial,
  getBuildReplay,
  forkProject,
  getUserForks,
} = require('../controllers/learningController');

// Public routes
router.get('/projects/:project_id/learning/tutorial', getTutorial);
router.get('/projects/:project_id/learning/replay', getBuildReplay);

// Protected routes
router.post('/projects/:project_id/learning/tutorial', protect, authorize('developer'), createTutorial);
router.post('/projects/:project_id/learning/fork', protect, forkProject);
router.get('/my-forks', protect, getUserForks);

module.exports = router;