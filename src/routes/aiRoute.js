const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

const {
  getCollaboratorSuggestions,
  getInvestorSuggestions,
  getProjectRecommendations,
  getImprovementSuggestions,
  generateSummary,
  generatePitchDraft,
  generateDescription,
  findBySkillMatch,
} = require('../controllers/aiController');

// Protected routes
router.use(protect);

router.get('/recommendations/collaborators/:project_id', authorize('developer'), getCollaboratorSuggestions);
router.get('/recommendations/investors/:project_id', authorize('developer'), getInvestorSuggestions);
router.get('/recommendations/projects', getProjectRecommendations);
router.get('/recommendations/improvements/:project_id', authorize('developer'), getImprovementSuggestions);
router.post('/generate/summary/:project_id', authorize('developer'), generateSummary);
router.post('/generate/pitch/:project_id', authorize('developer'), generatePitchDraft);
router.post('/generate/description', generateDescription);
router.get('/match/skills', findBySkillMatch);

module.exports = router;