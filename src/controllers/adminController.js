const sendResponse = require('../utils/sendResponse');
const ApiError = require('../utils/ApiError');
const { prisma } = require('../config/prisma');

const listUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    let where = {};

    if (role) {
      where.role = role;
    }

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          is_active: true,
          is_verified: true,
          reputation_score: true,
          created_at: true,
        }
      }),
      prisma.user.count({ where })
    ]);

    sendResponse(res, 200, users, null, {
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / take),
      },
    });
  } catch (err) {
    next(err);
  }
};

const suspendUser = async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { id: parseInt(req.params.user_id) },
      data: { is_active: false },
      select: {
        id: true,
        username: true,
        is_active: true,
      }
    });

    if (!user) {
      return next(new ApiError(404, 'User not found.'));
    }

    sendResponse(res, 200, user, 'User suspended.');
  } catch (err) {
    next(err);
  }
};

const changeUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const allowed = ['user', 'developer', 'investor', 'recruiter', 'admin'];

    if (!allowed.includes(role)) {
      return next(new ApiError(400, 'Invalid role provided.'));
    }

    const user = await prisma.user.update({
      where: { id: parseInt(req.params.user_id) },
      data: { role },
      select: {
        id: true,
        username: true,
        role: true,
      }
    });

    if (!user) {
      return next(new ApiError(404, 'User not found.'));
    }

    sendResponse(res, 200, user, 'User role updated.');
  } catch (err) {
    next(err);
  }
};

const listAllProjects = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        skip,
        take,
        orderBy: { created_at: 'desc' },
        include: {
          owner: {
            select: {
              username: true,
            }
          }
        },
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          visibility: true,
          is_featured: true,
          view_count: true,
          created_at: true,
          owner: {
            select: {
              username: true,
            }
          }
        }
      }),
      prisma.project.count()
    ]);

    sendResponse(res, 200, projects, null, {
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / take),
      },
    });
  } catch (err) {
    next(err);
  }
};

const featureProject = async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: parseInt(req.params.project_id) },
      select: { is_featured: true }
    });

    if (!project) {
      return next(new ApiError(404, 'Project not found.'));
    }

    const updatedProject = await prisma.project.update({
      where: { id: parseInt(req.params.project_id) },
      data: { is_featured: !project.is_featured },
      select: {
        id: true,
        title: true,
        is_featured: true,
      }
    });

    const msg = updatedProject.is_featured ? 'Project featured.' : 'Project unfeatured.';
    sendResponse(res, 200, updatedProject, msg);
  } catch (err) {
    next(err);
  }
};

const removeProject = async (req, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: parseInt(req.params.project_id) },
      select: { id: true, title: true }
    });

    if (!project) {
      return next(new ApiError(404, 'Project not found.'));
    }

    await prisma.project.delete({
      where: { id: parseInt(req.params.project_id) }
    });

    sendResponse(res, 200, null, `Project "${project.title}" has been removed.`);
  } catch (err) {
    next(err);
  }
};

const getReports = async (req, res, next) => {
  try {
    sendResponse(res, 200, [], 'Reports module coming in the next phase.');
  } catch (err) {
    next(err);
  }
};

const resolveReport = async (req, res, next) => {
  try {
    sendResponse(res, 200, null, 'Reports module coming in the next phase.');
  } catch (err) {
    next(err);
  }
};

const getPlatformStats = async (req, res, next) => {
  try {
    const [totalUsers, activeUsers, totalProjects, totalViews] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { is_active: true } }),
      prisma.project.count(),
      prisma.project.aggregate({
        _sum: { view_count: true }
      })
    ]);

    sendResponse(res, 200, {
      users: {
        total: totalUsers,
        active: activeUsers,
      },
      projects: {
        total: totalProjects,
        totalViews: totalViews._sum.view_count || 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listUsers,
  suspendUser,
  changeUserRole,
  listAllProjects,
  featureProject,
  removeProject,
  getReports,
  resolveReport,
  getPlatformStats,
};