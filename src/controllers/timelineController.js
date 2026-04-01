const sendResponse = require('../utils/sendResponse');
const ApiError = require('../utils/ApiError');
const { prisma } = require('../config/prisma');

const getTimeline = async (req, res, next) => {
  try {
    const { project_id } = req.params;

    const stages = await prisma.stage.findMany({
      where: { project_id: parseInt(project_id) },
      orderBy: { order_index: 'asc' },
      include: {
        milestones: {
          orderBy: { order_index: 'asc' },
        }
      }
    });

    sendResponse(res, 200, stages);
  } catch (err) {
    next(err);
  }
};

const createStage = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const { name, description, order_index } = req.body;

    const validNames = ['idea', 'planning', 'development', 'testing', 'deployment'];

    if (!validNames.includes(name)) {
      return next(new ApiError(400, `Stage name must be one of: ${validNames.join(', ')}`));
    }

    // Check ownership
    const project = await prisma.project.findUnique({
      where: { id: parseInt(project_id) },
      select: { owner_id: true }
    });

    if (!project) {
      return next(new ApiError(404, 'Project not found.'));
    }

    if (project.owner_id !== req.user.id) {
      return next(new ApiError(403, 'You do not own this project.'));
    }

    const stage = await prisma.stage.create({
      data: {
        project_id: parseInt(project_id),
        name,
        description: description || null,
        order_index: order_index || 0,
      }
    });

    sendResponse(res, 201, stage, 'Stage created.');
  } catch (err) {
    next(err);
  }
};

const updateStage = async (req, res, next) => {
  try {
    const { project_id, stage_id } = req.params;
    const { description, order_index } = req.body;

    // Check ownership
    const project = await prisma.project.findUnique({
      where: { id: parseInt(project_id) },
      select: { owner_id: true }
    });

    if (!project) {
      return next(new ApiError(404, 'Project not found.'));
    }

    if (project.owner_id !== req.user.id) {
      return next(new ApiError(403, 'You do not own this project.'));
    }

    const stage = await prisma.stage.update({
      where: { id: parseInt(stage_id), project_id: parseInt(project_id) },
      data: {
        description: description !== undefined ? description : undefined,
        order_index: order_index !== undefined ? order_index : undefined,
      }
    });

    sendResponse(res, 200, stage, 'Stage updated.');
  } catch (err) {
    next(err);
  }
};

const deleteStage = async (req, res, next) => {
  try {
    const { project_id, stage_id } = req.params;

    // Check ownership
    const project = await prisma.project.findUnique({
      where: { id: parseInt(project_id) },
      select: { owner_id: true }
    });

    if (!project) {
      return next(new ApiError(404, 'Project not found.'));
    }

    if (project.owner_id !== req.user.id) {
      return next(new ApiError(403, 'You do not own this project.'));
    }

    await prisma.stage.delete({
      where: { id: parseInt(stage_id), project_id: parseInt(project_id) }
    });

    sendResponse(res, 200, null, 'Stage deleted.');
  } catch (err) {
    next(err);
  }
};

const getMilestones = async (req, res, next) => {
  try {
    const { project_id } = req.params;

    const milestones = await prisma.milestone.findMany({
      where: { project_id: parseInt(project_id) },
      orderBy: { order_index: 'asc' },
    });

    sendResponse(res, 200, milestones);
  } catch (err) {
    next(err);
  }
};

const createMilestone = async (req, res, next) => {
  try {
    const { project_id, stage_id } = req.params;
    const { title, description, order_index, completed_at } = req.body;

    if (!title) {
      return next(new ApiError(400, 'Milestone title is required.'));
    }

    // Check ownership
    const project = await prisma.project.findUnique({
      where: { id: parseInt(project_id) },
      select: { owner_id: true }
    });

    if (!project) {
      return next(new ApiError(404, 'Project not found.'));
    }

    if (project.owner_id !== req.user.id) {
      return next(new ApiError(403, 'You do not own this project.'));
    }

    // Check stage exists
    const stage = await prisma.stage.findFirst({
      where: { id: parseInt(stage_id), project_id: parseInt(project_id) }
    });

    if (!stage) {
      return next(new ApiError(404, 'Stage not found in this project.'));
    }

    const milestone = await prisma.milestone.create({
      data: {
        stage_id: parseInt(stage_id),
        project_id: parseInt(project_id),
        title,
        description: description || null,
        order_index: order_index || 0,
        completed_at: completed_at ? new Date(completed_at) : null,
      }
    });

    sendResponse(res, 201, milestone, 'Milestone created.');
  } catch (err) {
    next(err);
  }
};

const updateMilestone = async (req, res, next) => {
  try {
    const { project_id, milestone_id } = req.params;
    const { title, description, order_index, completed_at } = req.body;

    // Check ownership
    const project = await prisma.project.findUnique({
      where: { id: parseInt(project_id) },
      select: { owner_id: true }
    });

    if (!project) {
      return next(new ApiError(404, 'Project not found.'));
    }

    if (project.owner_id !== req.user.id) {
      return next(new ApiError(403, 'You do not own this project.'));
    }

    const milestone = await prisma.milestone.update({
      where: { id: parseInt(milestone_id), project_id: parseInt(project_id) },
      data: {
        title: title !== undefined ? title : undefined,
        description: description !== undefined ? description : undefined,
        order_index: order_index !== undefined ? order_index : undefined,
        completed_at: completed_at !== undefined ? (completed_at ? new Date(completed_at) : null) : undefined,
      }
    });

    sendResponse(res, 200, milestone, 'Milestone updated.');
  } catch (err) {
    next(err);
  }
};

const deleteMilestone = async (req, res, next) => {
  try {
    const { project_id, milestone_id } = req.params;

    // Check ownership
    const project = await prisma.project.findUnique({
      where: { id: parseInt(project_id) },
      select: { owner_id: true }
    });

    if (!project) {
      return next(new ApiError(404, 'Project not found.'));
    }

    if (project.owner_id !== req.user.id) {
      return next(new ApiError(403, 'You do not own this project.'));
    }

    await prisma.milestone.delete({
      where: { id: parseInt(milestone_id), project_id: parseInt(project_id) }
    });

    sendResponse(res, 200, null, 'Milestone deleted.');
  } catch (err) {
    next(err);
  }
};

const addTimeLog = async (req, res, next) => {
  try {
    const { project_id, milestone_id } = req.params;
    const { hours, note } = req.body;

    if (!hours || isNaN(hours) || Number(hours) <= 0) {
      return next(new ApiError(400, 'Hours must be a positive number.'));
    }

    // Check ownership
    const project = await prisma.project.findUnique({
      where: { id: parseInt(project_id) },
      select: { owner_id: true }
    });

    if (!project) {
      return next(new ApiError(404, 'Project not found.'));
    }

    if (project.owner_id !== req.user.id) {
      return next(new ApiError(403, 'You do not own this project.'));
    }

    // Check milestone exists
    const milestone = await prisma.milestone.findFirst({
      where: { id: parseInt(milestone_id), project_id: parseInt(project_id) }
    });

    if (!milestone) {
      return next(new ApiError(404, 'Milestone not found in this project.'));
    }

    const timeLog = await prisma.timeLog.create({
      data: {
        milestone_id: parseInt(milestone_id),
        user_id: req.user.id,
        hours: parseFloat(hours),
        note: note || null,
      }
    });

    sendResponse(res, 201, timeLog, `${hours} hour(s) logged.`);
  } catch (err) {
    next(err);
  }
};



// MILESTONE MEDIA FUNCTIONS


const { cloudinary } = require('../config/cloudinary');


// Upload media to milestone 

 const uploadMilestoneMedia = async (req, res, next) => {
  try {
    const { project_id, milestone_id } = req.params;

    if (!req.file) {
      return next(new ApiError(400, 'No file uploaded'));
    }

    const project = await prisma.project.findUnique({
      where: { id: parseInt(project_id) },
      select: { owner_id: true }
    });

    if (!project) {
      return next(new ApiError(404, 'Project not found'));
    }

    if (project.owner_id !== req.user.id) {
      return next(new ApiError(403, 'Not authorized'));
    }

    const milestone = await prisma.milestone.findFirst({
      where: {
        id: parseInt(milestone_id),
        project_id: parseInt(project_id),
      }
    });

    if (!milestone) {
      return next(new ApiError(404, 'Milestone not found'));
    }

    const currentMedia = milestone.media || [];
    const newMedia = [...currentMedia, {
      url: req.file.path,
      filename: req.file.originalname,
      type: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
    }];

    const updatedMilestone = await prisma.milestone.update({
      where: { id: parseInt(milestone_id) },
      data: { media: newMedia },
    });

    sendResponse(res, 201, updatedMilestone, 'Media uploaded to milestone');
  } catch (err) {
    next(err);
  }
};


//Remove milestone media

const removeMilestoneMedia = async (req, res, next) => {
  try {
    const { project_id, milestone_id, media_id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id: parseInt(project_id) },
      select: { owner_id: true }
    });

    if (!project) {
      return next(new ApiError(404, 'Project not found'));
    }

    if (project.owner_id !== req.user.id) {
      return next(new ApiError(403, 'Not authorized'));
    }

    const milestone = await prisma.milestone.findFirst({
      where: {
        id: parseInt(milestone_id),
        project_id: parseInt(project_id),
      }
    });

    if (!milestone) {
      return next(new ApiError(404, 'Milestone not found'));
    }

    const mediaToDelete = milestone.media?.[parseInt(media_id)];
    if (mediaToDelete) {
      const publicId = mediaToDelete.url.split('/').pop().split('.')[0];
      await cloudinary.uploader.destroy(`devshowcase/projects/milestones/${publicId}`, {
        resource_type: mediaToDelete.type?.startsWith('video/') ? 'video' : 
                       mediaToDelete.type?.startsWith('image/') ? 'image' : 'raw'
      });
    }

    const newMedia = milestone.media.filter((_, index) => index !== parseInt(media_id));

    const updatedMilestone = await prisma.milestone.update({
      where: { id: parseInt(milestone_id) },
      data: { media: newMedia },
    });

    sendResponse(res, 200, updatedMilestone, 'Media removed from milestone');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getTimeline,
  createStage,
  updateStage,
  deleteStage,
  getMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  addTimeLog,
  uploadMilestoneMedia,
  removeMilestoneMedia,
};