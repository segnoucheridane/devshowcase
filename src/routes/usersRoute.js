const express = require('express');

const router = express.Router();

const { protect } = require('../middleware/auth');

const {
  getMyProfile,
  updateMyProfile,
  getUserProfile,
  getUserProjects,
  switchRole,
} = require('../controllers/userController');

router.get('/me',        protect, getMyProfile);
router.put('/me',        protect, updateMyProfile);
router.put('/me/roles',  protect, switchRole);

router.get('/:user_id',          getUserProfile);
router.get('/:user_id/projects', getUserProjects);

module.exports = router;
