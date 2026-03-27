const express = require('express');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

const {
  listUsers,
  suspendUser,
  changeUserRole,
  listAllProjects,
  featureProject,
  removeProject,
  getReports,
  resolveReport,
  getPlatformStats,
} = require('../controllers/adminController');

router.use(protect, authorize('admin'));

router.get('/users',                          listUsers);
router.put('/users/:user_id/suspend',         suspendUser);
router.put('/users/:user_id/role',            changeUserRole);

router.get('/projects',                       listAllProjects);
router.put('/projects/:project_id/feature',   featureProject);
router.delete('/projects/:project_id',        removeProject);

router.get('/reports',                        getReports);
router.put('/reports/:report_id/resolve',     resolveReport);

router.get('/analytics/platform',             getPlatformStats);

module.exports = router;
