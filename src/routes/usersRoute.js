const express = require('express');

const router = express.Router();

const { protect } = require('../middleware/auth');
const { uploadAvatar } = require('../config/cloudinary');


const {
  getMyProfile,
  updateMyProfile,
  getUserProfile,
  getUserProjects,
  switchRole,
  uploadAvatar: uploadAvatarController,
  deleteAvatar,
} = require('../controllers/userController');

router.get('/me', protect, getMyProfile);
router.put('/me', protect, updateMyProfile);
router.put('/me/roles', protect, switchRole);
router.post('/me/avatar', protect, uploadAvatar.single('avatar'), uploadAvatarController);
router.delete('/me/avatar', protect, deleteAvatar);

router.get('/:user_id', getUserProfile);
router.get('/:user_id/projects', getUserProjects);

module.exports = router;