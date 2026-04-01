const sendResponse = require('../utils/sendResponse');
const ApiError = require('../utils/ApiError');
const { prisma } = require('../config/prisma');


 //Get all collaborators for a project
 
const getCollaborators = async (req, res, next) => {
  try {
    const { project_id } = req.params;

    const collaborators = await prisma.collaboration.findMany({
      where: {
        project_id: parseInt(project_id),
        status: 'active',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            skills: true,
            reputation_score: true,
          }
        },
        inviter: {
          select: {
            id: true,
            username: true,
          }
        }
      },
      orderBy: { joined_at: 'asc' }
    });

    sendResponse(res, 200, collaborators);
  } catch (err) {
    next(err);
  }
};


//Invite a user to collaborate on a project
 
const inviteCollaborator = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const { email, role } = req.body;

    if (!email) {
      return next(new ApiError(400, 'Email is required'));
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      return next(new ApiError(404, 'User not found with this email'));
    }

    // Check if already invited or collaborating
    const existing = await prisma.collaboration.findUnique({
      where: {
        project_id_user_id: {
          project_id: parseInt(project_id),
          user_id: user.id,
        }
      }
    });

    if (existing) {
      if (existing.status === 'active') {
        return next(new ApiError(409, 'User is already a collaborator'));
      }
      if (existing.status === 'pending') {
        return next(new ApiError(409, 'User already has a pending invitation'));
      }
    }

    // Create invitation
    const invitation = await prisma.collaboration.create({
      data: {
        project_id: parseInt(project_id),
        user_id: user.id,
        role: role || 'contributor',
        invited_by: req.user.id,
        status: 'pending',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          }
        }
      }
    });

    sendResponse(res, 201, invitation, 'Invitation sent successfully');
  } catch (err) {
    next(err);
  }
};


//Request to join a project
 
const requestToJoin = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const { message } = req.body;

    // Check if already invited or collaborating
    const existing = await prisma.collaboration.findUnique({
      where: {
        project_id_user_id: {
          project_id: parseInt(project_id),
          user_id: req.user.id,
        }
      }
    });

    if (existing) {
      if (existing.status === 'active') {
        return next(new ApiError(409, 'You are already a collaborator'));
      }
      if (existing.status === 'pending') {
        return next(new ApiError(409, 'You already have a pending invitation'));
      }
    }

    // Create join request
    const request = await prisma.collaboration.create({
      data: {
        project_id: parseInt(project_id),
        user_id: req.user.id,
        role: 'contributor',
        status: 'pending',
        permissions: { joinMessage: message || null },
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            owner_id: true,
          }
        }
      }
    });

    sendResponse(res, 201, request, 'Join request sent successfully');
  } catch (err) {
    next(err);
  }
};


//Accept a collaboration invitation
 
const acceptInvitation = async (req, res, next) => {
  try {
    const { invite_id } = req.params;

    const invitation = await prisma.collaboration.findFirst({
      where: {
        id: parseInt(invite_id),
        user_id: req.user.id,
        status: 'pending',
      }
    });

    if (!invitation) {
      return next(new ApiError(404, 'Invitation not found or already processed'));
    }

    const updated = await prisma.collaboration.update({
      where: { id: parseInt(invite_id) },
      data: {
        status: 'active',
        joined_at: new Date(),
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
          }
        },
        user: {
          select: {
            id: true,
            username: true,
          }
        }
      }
    });

    sendResponse(res, 200, updated, 'Invitation accepted');
  } catch (err) {
    next(err);
  }
};


//Decline a collaboration invitation

const declineInvitation = async (req, res, next) => {
  try {
    const { invite_id } = req.params;

    const invitation = await prisma.collaboration.findFirst({
      where: {
        id: parseInt(invite_id),
        user_id: req.user.id,
        status: 'pending',
      }
    });

    if (!invitation) {
      return next(new ApiError(404, 'Invitation not found or already processed'));
    }

    await prisma.collaboration.delete({
      where: { id: parseInt(invite_id) }
    });

    sendResponse(res, 200, null, 'Invitation declined');
  } catch (err) {
    next(err);
  }
};


//Update a collaborator's role

const updateCollaboratorRole = async (req, res, next) => {
  try {
    const { project_id, user_id } = req.params;
    const { role } = req.body;

    const allowedRoles = ['owner', 'admin', 'contributor', 'viewer'];
    
    if (!allowedRoles.includes(role)) {
      return next(new ApiError(400, `Role must be one of: ${allowedRoles.join(', ')}`));
    }

    // Check if requester is project owner
    const project = await prisma.project.findUnique({
      where: { id: parseInt(project_id) },
      select: { owner_id: true }
    });

    if (!project) {
      return next(new ApiError(404, 'Project not found'));
    }

    if (project.owner_id !== req.user.id) {
      return next(new ApiError(403, 'Only the project owner can change roles'));
    }

    // Cannot change owner role
    if (role === 'owner') {
      return next(new ApiError(400, 'Cannot assign owner role through this endpoint'));
    }

    const updated = await prisma.collaboration.update({
      where: {
        project_id_user_id: {
          project_id: parseInt(project_id),
          user_id: parseInt(user_id),
        }
      },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          }
        }
      }
    });

    sendResponse(res, 200, updated, 'Collaborator role updated');
  } catch (err) {
    next(err);
  }
};


//Remove a collaborator from project

const removeCollaborator = async (req, res, next) => {
  try {
    const { project_id, user_id } = req.params;

    // Check if requester is project owner
    const project = await prisma.project.findUnique({
      where: { id: parseInt(project_id) },
      select: { owner_id: true }
    });

    if (!project) {
      return next(new ApiError(404, 'Project not found'));
    }

    if (project.owner_id !== req.user.id) {
      return next(new ApiError(403, 'Only the project owner can remove collaborators'));
    }

    // Cannot remove project owner
    if (project.owner_id === parseInt(user_id)) {
      return next(new ApiError(400, 'Cannot remove the project owner'));
    }

    await prisma.collaboration.delete({
      where: {
        project_id_user_id: {
          project_id: parseInt(project_id),
          user_id: parseInt(user_id),
        }
      }
    });

    sendResponse(res, 200, null, 'Collaborator removed successfully');
  } catch (err) {
    next(err);
  }
};


//Get pending invitations for current user

const getUserInvites = async (req, res, next) => {
  try {
    const invites = await prisma.collaboration.findMany({
      where: {
        user_id: req.user.id,
        status: 'pending',
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            owner: {
              select: {
                id: true,
                username: true,
                avatar: true,
              }
            }
          }
        },
        inviter: {
          select: {
            id: true,
            username: true,
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    sendResponse(res, 200, invites);
  } catch (err) {
    next(err);
  }
};


//Get join requests for projects owned by current user

const getJoinRequests = async (req, res, next) => {
  try {
    const { project_id } = req.params;

    // Check if user owns the project
    const project = await prisma.project.findUnique({
      where: { id: parseInt(project_id) },
      select: { owner_id: true }
    });

    if (!project) {
      return next(new ApiError(404, 'Project not found'));
    }

    if (project.owner_id !== req.user.id) {
      return next(new ApiError(403, 'You do not own this project'));
    }

    const requests = await prisma.collaboration.findMany({
      where: {
        project_id: parseInt(project_id),
        status: 'pending',
        invited_by: null,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            skills: true,
            reputation_score: true,
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    sendResponse(res, 200, requests);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCollaborators,
  inviteCollaborator,
  requestToJoin,
  acceptInvitation,
  declineInvitation,
  updateCollaboratorRole,
  removeCollaborator,
  getUserInvites,
  getJoinRequests,
};