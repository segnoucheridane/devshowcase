const { prisma } = require('../config/prisma');
const { createUniqueSlug } = require('../utils/slugify');

class LearningService {
  /**
   * Convert project into a tutorial
   */
  async createTutorial(projectId, ownerId, data) {
    const { title, description, steps } = data;

    // Verify project ownership
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { owner_id: true, title: true, description: true }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    if (project.owner_id !== ownerId) {
      throw new Error('You do not own this project');
    }

    // Check if tutorial already exists
    const existing = await prisma.tutorial.findUnique({
      where: { project_id: projectId }
    });

    if (existing) {
      throw new Error('Tutorial already exists for this project');
    }

    // Create tutorial
    const tutorial = await prisma.tutorial.create({
      data: {
        project_id: projectId,
        owner_id: ownerId,
        title: title || `How to build: ${project.title}`,
        description: description || project.description,
        steps: steps || [],
      }
    });

    return tutorial;
  }

  /**
   * Get tutorial for a project
   */
  async getTutorial(projectId) {
    const tutorial = await prisma.tutorial.findUnique({
      where: { project_id: projectId },
      include: {
        project: {
          select: {
            title: true,
            description: true,
            technologies: true,
            owner: {
              select: {
                username: true,
                avatar: true,
              }
            }
          }
        }
      }
    });

    if (!tutorial) {
      throw new Error('No tutorial found for this project');
    }

    return tutorial;
  }

  /**
   * Get build replay (step-by-step timeline)
   */
  async getBuildReplay(projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        stages: {
          orderBy: { order_index: 'asc' },
          include: {
            milestones: {
              orderBy: { order_index: 'asc' },
              include: {
                time_logs: true
              }
            }
          }
        }
      }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Format as replay steps
    const replay = {
      project_id: project.id,
      title: project.title,
      created_at: project.created_at,
      stages: project.stages.map(stage => ({
        name: stage.name,
        description: stage.description,
        milestones: stage.milestones.map(milestone => ({
          title: milestone.title,
          description: milestone.description,
          completed_at: milestone.completed_at,
          time_spent: milestone.time_logs.reduce((sum, log) => sum + Number(log.hours), 0),
        }))
      }))
    };

    return replay;
  }

  /**
   * Fork a project for practice
   */
  async forkProject(originalProjectId, userId, forkName = null) {
    // Get original project
    const originalProject = await prisma.project.findUnique({
      where: { id: originalProjectId },
      include: {
        stages: {
          include: {
            milestones: true
          }
        }
      }
    });

    if (!originalProject) {
      throw new Error('Project not found');
    }

    // Check if already forked
    const existingFork = await prisma.fork.findUnique({
      where: {
        original_project_id_forked_by: {
          original_project_id: originalProjectId,
          forked_by: userId,
        }
      }
    });

    if (existingFork) {
      throw new Error('You have already forked this project');
    }

    // Create forked project copy
    const forkNameToUse = forkName || `${originalProject.title} (Fork)`;
    const slug = createUniqueSlug(forkNameToUse);

    const forkedProject = await prisma.project.create({
      data: {
        owner_id: userId,
        title: forkNameToUse,
        slug,
        description: originalProject.description,
        full_description: originalProject.full_description,
        status: 'idea',
        visibility: 'private',
        technologies: originalProject.technologies,
        industries: originalProject.industries,
        tags: originalProject.tags,
        problem_solved: originalProject.problem_solved,
      }
    });

    // Copy stages and milestones
    for (const stage of originalProject.stages) {
      const newStage = await prisma.stage.create({
        data: {
          project_id: forkedProject.id,
          name: stage.name,
          description: stage.description,
          order_index: stage.order_index,
        }
      });

      for (const milestone of stage.milestones) {
        await prisma.milestone.create({
          data: {
            stage_id: newStage.id,
            project_id: forkedProject.id,
            title: milestone.title,
            description: milestone.description,
            order_index: milestone.order_index,
          }
        });
      }
    }

    // Record the fork
    const fork = await prisma.fork.create({
      data: {
        original_project_id: originalProjectId,
        forked_by: userId,
        fork_name: forkNameToUse,
        forked_project_id: forkedProject.id,
      }
    });

    return {
      fork,
      forked_project: forkedProject,
    };
  }

  /**
   * Get user's forked projects
   */
  async getUserForks(userId) {
    const forks = await prisma.fork.findMany({
      where: { forked_by: userId },
      include: {
        originalProject: {
          select: {
            id: true,
            title: true,
            owner: {
              select: {
                username: true,
              }
            }
          }
        },
        forkedProject: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            created_at: true,
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return forks;
  }
}

module.exports = new LearningService();