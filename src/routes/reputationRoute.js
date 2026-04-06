const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');

const {
  getReputationScore,
  endorseUser,
  getUserEndorsements,
  removeEndorsement,
  getBuildVerification,
  requestBuildVerification,
  getActivityHistory,
} = require('../controllers/reputationController');


// Public routes

router.get('/users/:user_id/reputation', getReputationScore);
router.get('/users/:user_id/endorsements', getUserEndorsements);
router.get('/users/:user_id/activity-history', getActivityHistory);
router.get('/projects/:project_id/verification', getBuildVerification);


// Protected routes

router.post('/users/:user_id/endorsements', protect, endorseUser);
router.delete('/users/:user_id/endorsements/:skill', protect, removeEndorsement);
router.post('/projects/:project_id/verify-build', protect, requestBuildVerification);

module.exports = router;