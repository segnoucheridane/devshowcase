const express = require('express');
const router = express.Router();

const { protect, authorize, optionalAuth } = require('../middleware/auth');
const { 
  uploadThumbnail, 
  uploadGallery, 
  uploadProjectAssets 
} = require('../config/cloudinary');

const {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  addTechnology,
  removeTechnology,
  addIndustry,
  updateVisibility,
  uploadThumbnail: uploadThumbnailController,
  uploadGallery: uploadGalleryController,
  removeGalleryImage,
  uploadProjectAssets: uploadProjectAssetsController,
  deleteProjectAsset,
  getProjectAssets,
} = require('../controllers/projectController');


// Public routes

router.get('/', optionalAuth, listProjects);
router.get('/:project_id', optionalAuth, getProject);
router.get('/:project_id/assets', optionalAuth, getProjectAssets);


// Protected routes (Developer only)

router.post('/', protect, authorize('developer'), createProject);


// Owner-only routes

router.put('/:project_id', protect, updateProject);
router.delete('/:project_id', protect, deleteProject);
router.put('/:project_id/visibility', protect, updateVisibility);

// Technologies
router.post('/:project_id/technologies', protect, addTechnology);
router.delete('/:project_id/technologies/:tech', protect, removeTechnology);

// Industries
router.post('/:project_id/industries', protect, addIndustry);


// Media routes
// Thumbnail
router.post('/:project_id/thumbnail', protect, uploadThumbnail.single('thumbnail'), uploadThumbnailController);

// Gallery
router.post('/:project_id/gallery', protect, uploadGallery.array('images', 10), uploadGalleryController);
router.delete('/:project_id/gallery/:image_id', protect, removeGalleryImage);

// Assets (code, docs, images, videos)
router.post('/:project_id/assets', protect, uploadProjectAssets.array('assets', 20), uploadProjectAssetsController);
router.delete('/:project_id/assets/:asset_id', protect, deleteProjectAsset);

module.exports = router;