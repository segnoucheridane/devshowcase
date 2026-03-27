const express = require('express');

const router = express.Router();

const { protect } = require('../middleware/auth');

const {
  getTimeline,
  createStage,
  updateStage,
  deleteStage,
  getMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  addTimeLog,
} = require('../controllers/timelineController');

router.get('/:project_id/timeline',                                             getTimeline);
router.get('/:project_id/timeline/milestones',                                  getMilestones);

router.post('/:project_id/timeline/stages',                                     protect, createStage);
router.put('/:project_id/timeline/stages/:stage_id',                            protect, updateStage);
router.delete('/:project_id/timeline/stages/:stage_id',                         protect, deleteStage);

router.post('/:project_id/timeline/stages/:stage_id/milestones',                protect, createMilestone);
router.put('/:project_id/timeline/milestones/:milestone_id',                    protect, updateMilestone);
router.delete('/:project_id/timeline/milestones/:milestone_id',                 protect, deleteMilestone);

router.post('/:project_id/timeline/milestones/:milestone_id/timelog',           protect, addTimeLog);

module.exports = router;
