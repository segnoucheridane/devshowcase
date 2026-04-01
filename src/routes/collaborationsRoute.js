const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

const {
  getCollaborators,
  inviteCollaborator,
  requestToJoin,
  acceptInvitation,
  declineInvitation,
  updateCollaboratorRole,
  removeCollaborator,
  getUserInvites,
  getJoinRequests,
} = require('../controllers/collaborationController');

// Public routes (read-only)

router.get('/projects/:project_id/collaborators', getCollaborators);


// Protected routes - User's own invites

router.get('/invites', protect, getUserInvites);
router.put('/invites/:invite_id/accept', protect, acceptInvitation);
router.put('/invites/:invite_id/decline', protect, declineInvitation);


// Protected routes - Project collaboration actions

router.post('/projects/:project_id/collaborators/invite', protect, authorize('developer'), inviteCollaborator);
router.post('/projects/:project_id/collaborators/request', protect, requestToJoin);
router.put('/projects/:project_id/collaborators/:user_id/role', protect, updateCollaboratorRole);
router.delete('/projects/:project_id/collaborators/:user_id', protect, removeCollaborator);
router.get('/projects/:project_id/requests', protect, getJoinRequests);

module.exports = router;