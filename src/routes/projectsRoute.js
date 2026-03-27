const express = require('express');

const router = express.Router();

const { protect, authorize, optionalAuth } = require('../middleware/auth');

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
} = require('../controllers/projectController');

router.get('/',                                          optionalAuth, listProjects);
router.get('/:project_id',                               optionalAuth, getProject);
router.post('/',                                         protect, authorize('developer', 'admin'), createProject);
router.put('/:project_id',                               protect, updateProject);
router.delete('/:project_id',                            protect, deleteProject);
router.post('/:project_id/technologies',                 protect, addTechnology);
router.delete('/:project_id/technologies/:tech',         protect, removeTechnology);
router.post('/:project_id/industries',                   protect, addIndustry);
router.put('/:project_id/visibility',                    protect, updateVisibility);

module.exports = router;
