const sendResponse = require('../utils/sendResponse');
const ApiError = require('../utils/ApiError');
const { prisma } = require('../config/prisma');

const getMyProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        bio: true,
        avatar: true,
        website: true,
        github: true,
        linkedin: true,
        skills: true,
        reputation_score: true,
        is_verified: true,
        created_at: true,
      }
    });

    sendResponse(res, 200, user);
  } catch (err) {
    next(err);
  }
};

const updateMyProfile = async (req, res, next) => {
  try {
    const { bio, website, github, linkedin, skills } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        bio: bio !== undefined ? bio : undefined,
        website: website !== undefined ? website : undefined,
        github: github !== undefined ? github : undefined,
        linkedin: linkedin !== undefined ? linkedin : undefined,
        skills: skills !== undefined ? skills : undefined,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        bio: true,
        avatar: true,
        website: true,
        github: true,
        linkedin: true,
        skills: true,
        reputation_score: true,
      }
    });

    sendResponse(res, 200, updatedUser, 'Profile updated.');
  } catch (err) {
    next(err);
  }
};

const getUserProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.user_id), is_active: true },
      select: {
        id: true,
        username: true,
        role: true,
        bio: true,
        avatar: true,
        website: true,
        github: true,
        linkedin: true,
        skills: true,
        reputation_score: true,
        created_at: true,
      }
    });

    if (!user) {
      return next(new ApiError(404, 'User not found.'));
    }

    sendResponse(res, 200, user);
  } catch (err) {
    next(err);
  }
};

const getUserProjects = async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        owner_id: parseInt(req.params.user_id),
        visibility: 'public',
      },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        status: true,
        technologies: true,
        thumbnail_url: true,
        view_count: true,
        like_count: true,
        created_at: true,
      }
    });

    sendResponse(res, 200, projects);
  } catch (err) {
    next(err);
  }
};

const switchRole = async (req, res, next) => {
  try {
    const { role } = req.body;

    const allowed = ['user', 'developer', 'investor', 'recruiter'];

    if (!allowed.includes(role)) {
      return next(new ApiError(400, `Role must be one of: ${allowed.join(', ')}`));
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { role },
      select: {
        id: true,
        username: true,
        role: true,
      }
    });

    sendResponse(res, 200, updatedUser, 'Role updated.');
  } catch (err) {
    next(err);
  }
};



// AVATAR UPLOAD FUNCTIONS

const { cloudinary } = require('../config/cloudinary');


//Upload user avatar

const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new ApiError(400, 'No file uploaded'));
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { avatar: true }
    });

    if (currentUser.avatar) {
      const publicId = currentUser.avatar.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`devshowcase/avatars/${publicId}`);
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar: req.file.path },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
      }
    });

    sendResponse(res, 200, updatedUser, 'Avatar updated successfully');
  } catch (err) {
    next(err);
  }
};

 //Delete user avatar
 
const deleteAvatar = async (req, res, next) => {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { avatar: true }
    });

    if (currentUser.avatar) {
      const publicId = currentUser.avatar.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`devshowcase/avatars/${publicId}`);
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatar: null },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
      }
    });

    sendResponse(res, 200, updatedUser, 'Avatar removed');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  getUserProfile,
  getUserProjects,
  switchRole,
  uploadAvatar,
  deleteAvatar,
};