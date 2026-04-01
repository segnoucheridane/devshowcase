const { prisma } = require('../config/prisma');
const { createUniqueSlug } = require('../utils/slugify');

class ProjectService {
  /**
   * Create a new project
   */
  async createProject(ownerId, projectData) {
    const {
      title,
      description,
      full_description,
      status,
      visibility,
      technologies,
      industries,
      tags,
      problem_solved,
      repo_url,
      demo_url,
    } = projectData;
    
    if (!title || !description) {
      throw new Error('Title and description are required');
    }
    
    const slug = createUniqueSlug(title);
    
    const project = await prisma.project.create({
      data: {
        owner_id: ownerId,
        title,
        slug,
        description,
        full_description: full_description || null,
        status: status || 'idea',
        visibility: visibility || 'public',
        technologies: technologies || [],
        industries: industries || [],
        tags: tags || [],
        problem_solved: problem_solved || null,
        repo_url: repo_url || null,
        demo_url: demo_url || null,
      }
    });
    
    return project;
  }
  
  /**
   * Get projects with filters and pagination
   */
  async getProjects(filters = {}, pagination = {}) {
    const {
      page = 1,
      limit = 12,
      search,
      technology,
      industry,
      status,
      sort = 'created_at',
      fundingOpen,
      forSale,
    } = filters;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);
    
    let where = { visibility: 'public' };
    
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { problem_solved: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (technology) where.technologies = { has: technology };
    if (industry) where.industries = { has: industry };
    if (status) where.status = status;
    if (fundingOpen === 'true') where.is_funding_open = true;
    if (forSale === 'true') where.is_for_sale = true;
    
    let orderBy = {};
    if (sort === 'created_at') orderBy = { created_at: 'desc' };
    else if (sort === 'view_count') orderBy = { view_count: 'desc' };
    else if (sort === 'like_count') orderBy = { like_count: 'desc' };
    else orderBy = { created_at: 'desc' };
    
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              avatar: true,
            }
          }
        }
      }),
      prisma.project.count({ where })
    ]);
    
    return {
      projects,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / take),
        limit: take,
      }
    };
  }
  
  /**
   * Get a single project by ID or slug
   */
  async getProject(identifier, userId = null) {
    const isId = /^\d+$/.test(identifier);
    
    let project;
    if (isId) {
      project = await prisma.project.findUnique({
        where: { id: parseInt(identifier) },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              avatar: true,
              bio: true,
              reputation_score: true,
            }
          }
        }
      });
    } else {
      project = await prisma.project.findUnique({
        where: { slug: identifier },
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              avatar: true,
              bio: true,
              reputation_score: true,
            }
          }
        }
      });
    }
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    // Check private visibility
    if (project.visibility === 'private') {
      if (!userId || userId !== project.owner_id) {
        throw new Error('This project is private');
      }
    }
    
    // Increment view count if not owner
    if (!userId || userId !== project.owner_id) {
      await prisma.project.update({
        where: { id: project.id },
        data: { view_count: { increment: 1 } }
      });
      project.view_count += 1;
    }
    
    return project;
  }
  
  /**
   * Update a project
   */
  async updateProject(projectId, userId, updateData) {
    const { title, description, full_description, problem_solved, repo_url, demo_url, tags } = updateData;
    
    // Check ownership
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { owner_id: true }
    });
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    if (project.owner_id !== userId) {
      throw new Error('You do not own this project');
    }
    
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: {
        title: title !== undefined ? title : undefined,
        description: description !== undefined ? description : undefined,
        full_description: full_description !== undefined ? full_description : undefined,
        problem_solved: problem_solved !== undefined ? problem_solved : undefined,
        repo_url: repo_url !== undefined ? repo_url : undefined,
        demo_url: demo_url !== undefined ? demo_url : undefined,
        tags: tags !== undefined ? tags : undefined,
      }
    });
    
    return updatedProject;
  }
  
  /**
   * Delete a project
   */
  async deleteProject(projectId, userId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { owner_id: true, title: true }
    });
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    if (project.owner_id !== userId) {
      throw new Error('You do not own this project');
    }
    
    await prisma.project.delete({
      where: { id: projectId }
    });
    
    return { title: project.title };
  }
  
  /**
   * Add technology to project
   */
  async addTechnology(projectId, userId, technology) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { owner_id: true, technologies: true }
    });
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    if (project.owner_id !== userId) {
      throw new Error('Not authorized');
    }
    
    if (!project.technologies.includes(technology)) {
      const updatedProject = await prisma.project.update({
        where: { id: projectId },
        data: { technologies: { push: technology } },
        select: { technologies: true }
      });
      return updatedProject;
    }
    
    return { technologies: project.technologies };
  }
  
  /**
   * Remove technology from project
   */
  async removeTechnology(projectId, userId, technology) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { owner_id: true, technologies: true }
    });
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    if (project.owner_id !== userId) {
      throw new Error('Not authorized');
    }
    
    const updatedTechnologies = project.technologies.filter(t => t !== technology);
    
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: { technologies: updatedTechnologies },
      select: { technologies: true }
    });
    
    return updatedProject;
  }
  
  /**
   * Update project visibility
   */
  async updateVisibility(projectId, userId, visibility) {
    const allowed = ['public', 'private', 'unlisted'];
    
    if (!allowed.includes(visibility)) {
      throw new Error("Visibility must be 'public', 'private', or 'unlisted'");
    }
    
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { owner_id: true }
    });
    
    if (!project) {
      throw new Error('Project not found');
    }
    
    if (project.owner_id !== userId) {
      throw new Error('Not authorized');
    }
    
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: { visibility },
      select: { id: true, title: true, visibility: true }
    });
    
    return updatedProject;
  }
}

module.exports = new ProjectService();