const { prisma } = require('../config/prisma');

class SearchService {
  
   //Search projects with filters
   
  async searchProjects(filters = {}, pagination = {}) {
    const {
      q,                    // search query
      technology,
      industry,
      status,
      minViews,
      maxViews,
      minFunding,
      maxFunding,
      sort = 'relevance',   // relevance, newest, most_viewed, most_funded
      page = 1,
      limit = 12,
    } = filters;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where conditions
    let where = {
      visibility: 'public',
      status: { not: 'archived' },
    };

    // Full-text search on title, description, problem_solved
    if (q && q.trim()) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { problem_solved: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Technology filter (array contains)
    if (technology) {
      where.technologies = { has: technology };
    }

    // Industry filter (array contains)
    if (industry) {
      where.industries = { has: industry };
    }

    // Status filter
    if (status) {
      where.status = status;
    }

    // View count range
    if (minViews || maxViews) {
      where.view_count = {};
      if (minViews) where.view_count.gte = parseInt(minViews);
      if (maxViews) where.view_count.lte = parseInt(maxViews);
    }

    // Funding range
    if (minFunding || maxFunding) {
      where.funding_goal = {};
      if (minFunding) where.funding_goal.gte = parseFloat(minFunding);
      if (maxFunding) where.funding_goal.lte = parseFloat(maxFunding);
      where.is_funding_open = true;
    }

    // Determine sort order
    let orderBy = [];
    switch (sort) {
      case 'newest':
        orderBy = [{ created_at: 'desc' }];
        break;
      case 'most_viewed':
        orderBy = [{ view_count: 'desc' }, { created_at: 'desc' }];
        break;
      case 'most_funded':
        orderBy = [{ funding_raised: 'desc' }, { created_at: 'desc' }];
        break;
      case 'relevance':
      default:
        if (q && q.trim()) {
          // For relevance, we'll sort by a combination of factors
          // This is handled after query, but for now sort by views
          orderBy = [{ view_count: 'desc' }, { created_at: 'desc' }];
        } else {
          orderBy = [{ created_at: 'desc' }];
        }
        break;
    }

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
              reputation_score: true,
            }
          }
        }
      }),
      prisma.project.count({ where })
    ]);

    // Calculate relevance score if search query exists
    let results = projects;
    if (q && q.trim() && sort === 'relevance') {
      results = this.calculateRelevance(projects, q);
    }

    return {
      projects: results,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / take),
        limit: take,
      },
    };
  }

  
   //Calculate relevance score for projects based on search query
   
  calculateRelevance(projects, query) {
    const searchTerms = query.toLowerCase().split(' ');
    
    return projects.map(project => {
      let score = 0;
      const title = project.title.toLowerCase();
      const description = project.description?.toLowerCase() || '';
      const problem = project.problem_solved?.toLowerCase() || '';
      
      searchTerms.forEach(term => {
        // Title matches are weighted highest
        if (title.includes(term)) score += 10;
        // Description matches
        if (description.includes(term)) score += 3;
        // Problem solved matches
        if (problem.includes(term)) score += 5;
        // Technology matches
        if (project.technologies?.some(tech => tech.toLowerCase().includes(term))) score += 4;
        // Industry matches
        if (project.industries?.some(ind => ind.toLowerCase().includes(term))) score += 4;
      });
      
      // Boost by popularity
      score += Math.log10(project.view_count + 1);
      score += (project.like_count || 0) * 0.5;
      
      return { ...project, _relevanceScore: score };
    }).sort((a, b) => b._relevanceScore - a._relevanceScore);
  }

  
   //Get all available filter options
   
  async getFilterOptions() {
    const [technologies, industries, statuses] = await Promise.all([
      this.getDistinctTechnologies(),
      this.getDistinctIndustries(),
      this.getDistinctStatuses(),
    ]);

    return {
      technologies,
      industries,
      statuses,
    };
  }

  
   //Get distinct technologies from all projects
   
  async getDistinctTechnologies() {
    const projects = await prisma.project.findMany({
      where: { visibility: 'public' },
      select: { technologies: true },
    });
    
    const techSet = new Set();
    projects.forEach(project => {
      project.technologies?.forEach(tech => techSet.add(tech));
    });
    
    return Array.from(techSet).sort();
  }


   //Get distinct industries from all projects
   
  async getDistinctIndustries() {
    const projects = await prisma.project.findMany({
      where: { visibility: 'public' },
      select: { industries: true },
    });
    
    const industrySet = new Set();
    projects.forEach(project => {
      project.industries?.forEach(ind => industrySet.add(ind));
    });
    
    return Array.from(industrySet).sort();
  }

  
   //Get distinct statuses from all projects
   
  async getDistinctStatuses() {
    const projects = await prisma.project.findMany({
      where: { visibility: 'public' },
      select: { status: true },
    });
    
    const statusSet = new Set();
    projects.forEach(project => {
      if (project.status) statusSet.add(project.status);
    });
    
    return Array.from(statusSet).sort();
  }

  
   //Get trending projects (based on views, likes, and recent activity)
   
  async getTrendingProjects(limit = 10) {
    const trending = await prisma.project.findMany({
      where: {
        visibility: 'public',
        status: { not: 'archived' },
      },
      orderBy: [
        { view_count: 'desc' },
        { like_count: 'desc' },
        { created_at: 'desc' },
      ],
      take: limit,
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatar: true,
            reputation_score: true,
          }
        }
      }
    });

    return trending;
  }

  
   //Get personalized recommendations for a user
   
  async getPersonalizedRecommendations(userId, limit = 10) {
    // Get user's interests from their skills and projects they've interacted with
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        skills: true,
        projects: {
          where: { visibility: 'public' },
          select: { technologies: true, industries: true }
        }
      }
    });

    if (!user) {
      return this.getTrendingProjects(limit);
    }

    // Build interest tags from user's skills and project technologies
    const interests = [...(user.skills || [])];
    
    user.projects.forEach(project => {
      project.technologies?.forEach(tech => interests.push(tech));
      project.industries?.forEach(ind => interests.push(ind));
    });

    // Remove duplicates
    const uniqueInterests = [...new Set(interests)];

    if (uniqueInterests.length === 0) {
      return this.getTrendingProjects(limit);
    }

    // Find projects matching user's interests
    const recommendations = await prisma.project.findMany({
      where: {
        visibility: 'public',
        status: { not: 'archived' },
        owner_id: { not: userId }, // Exclude user's own projects
        OR: [
          { technologies: { hasSome: uniqueInterests } },
          { industries: { hasSome: uniqueInterests } },
        ],
      },
      orderBy: [
        { view_count: 'desc' },
        { like_count: 'desc' },
      ],
      take: limit,
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            avatar: true,
            reputation_score: true,
          }
        }
      }
    });

    return recommendations;
  }

  
   //et all project categories (technologies, industries grouped)
   
  async getCategories() {
    const technologies = await this.getDistinctTechnologies();
    const industries = await this.getDistinctIndustries();

    return {
      technologies: technologies.map(tech => ({
        name: tech,
        count: 0, // Can calculate count if needed
      })),
      industries: industries.map(ind => ({
        name: ind,
        count: 0,
      })),
    };
  }

  
   //Get trending technology tags
   
  async getTrendingTags(limit = 20) {
    const projects = await prisma.project.findMany({
      where: { visibility: 'public' },
      select: { technologies: true },
    });

    const techCount = new Map();
    projects.forEach(project => {
      project.technologies?.forEach(tech => {
        techCount.set(tech, (techCount.get(tech) || 0) + 1);
      });
    });

    const sortedTags = Array.from(techCount.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return sortedTags;
  }
}

module.exports = new SearchService();