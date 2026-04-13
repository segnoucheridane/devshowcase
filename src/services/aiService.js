const { prisma } = require('../config/prisma');

class AIService {
  /**
   * Get AI-suggested collaborators for a project
   */
  async getCollaboratorSuggestions(projectId, userId) {
    // Verify project ownership
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { owner_id: true, technologies: true, industries: true }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    if (project.owner_id !== userId) {
      throw new Error('You do not own this project');
    }

    // Find users with matching skills
    const suggestedUsers = await prisma.user.findMany({
      where: {
        id: { not: userId },
        is_active: true,
        skills: { hasSome: project.technologies || [] }
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        skills: true,
        reputation_score: true,
      },
      take: 10,
      orderBy: { reputation_score: 'desc' }
    });

    // Calculate match score
    const suggestions = suggestedUsers.map(user => {
      const matchCount = user.skills.filter(skill => 
        project.technologies?.includes(skill)
      ).length;
      const matchScore = (matchCount / (project.technologies?.length || 1)) * 100;
      
      return {
        ...user,
        match_score: Math.round(matchScore),
        suggested_role: matchCount > 2 ? 'Senior Contributor' : 'Contributor'
      };
    }).sort((a, b) => b.match_score - a.match_score);

    return suggestions;
  }

  /**
   * Get AI-suggested investors for a project
   */
  async getInvestorSuggestions(projectId, userId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { 
        owner_id: true, 
        industries: true, 
        funding_goal: true,
        title: true
      }
    });

    if (!project) throw new Error('Project not found');
    if (project.owner_id !== userId) throw new Error('You do not own this project');

    // Find users with investor role who have invested in similar industries
    const investors = await prisma.user.findMany({
      where: {
        role: 'investor',
        is_active: true,
        investments: { some: {} }
      },
      include: {
        investments: {
          include: {
            fundingRequest: {
              include: {
                project: true
              }
            }
          }
        }
      },
      take: 10
    });

    const suggestions = investors.map(investor => {
      const investedIndustries = investor.investments
        .map(inv => inv.fundingRequest?.project?.industries || [])
        .flat();
      
      const matchCount = investedIndustries.filter(ind => 
        project.industries?.includes(ind)
      ).length;
      
      const matchScore = (matchCount / (project.industries?.length || 1)) * 100;

      return {
        id: investor.id,
        username: investor.username,
        avatar: investor.avatar,
        reputation_score: investor.reputation_score,
        match_score: Math.round(matchScore),
        total_investments: investor.investments.length
      };
    }).sort((a, b) => b.match_score - a.match_score);

    return suggestions;
  }

  /**
   * Get project recommendations for user
   */
  async getProjectRecommendations(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { skills: true, projects: { select: { technologies: true } } }
    });

    const userSkills = user?.skills || [];
    const userTechs = user?.projects?.flatMap(p => p.technologies) || [];

    const interests = [...new Set([...userSkills, ...userTechs])];

    const projects = await prisma.project.findMany({
      where: {
        visibility: 'public',
        owner_id: { not: userId },
        technologies: { hasSome: interests.length > 0 ? interests : [''] }
      },
      include: {
        owner: {
          select: {
            username: true,
            avatar: true,
            reputation_score: true
          }
        }
      },
      take: 12,
      orderBy: { view_count: 'desc' }
    });

    return projects;
  }

  /**
   * Get AI improvement suggestions for a project
   */
  async getImprovementSuggestions(projectId, userId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { 
        owner_id: true,
        title: true,
        description: true,
        technologies: true,
        industries: true,
        view_count: true
      }
    });

    if (!project) throw new Error('Project not found');
    if (project.owner_id !== userId) throw new Error('You do not own this project');

    const suggestions = [];

    // Technology suggestions
    if (project.technologies.length < 3) {
      suggestions.push({
        category: 'technologies',
        message: 'Add more technology tags to improve discoverability',
        priority: 'medium'
      });
    }

    // Description suggestions
    if (project.description.length < 100) {
      suggestions.push({
        category: 'description',
        message: 'Expand your project description with more details about features and use cases',
        priority: 'high'
      });
    }

    // Industry suggestions
    if (project.industries.length === 0) {
      suggestions.push({
        category: 'industries',
        message: 'Add industry tags to attract relevant investors and collaborators',
        priority: 'medium'
      });
    }

    // Visibility suggestions
    if (project.view_count < 10) {
      suggestions.push({
        category: 'visibility',
        message: 'Share your project on social media to increase visibility',
        priority: 'low'
      });
    }

    return suggestions;
  }

  /**
   * Generate AI project summary
   */
  async generateSummary(projectId, userId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { owner_id: true, title: true, description: true, technologies: true }
    });

    if (!project) throw new Error('Project not found');
    if (project.owner_id !== userId) throw new Error('You do not own this project');

    // Generate summary (simulated AI)
    const summary = `${project.title} is a project built with ${project.technologies.join(', ')}. ${project.description.substring(0, 200)}... This project aims to solve real-world problems using modern technology stack.`;

    return {
      project_id: projectId,
      title: project.title,
      summary: summary,
      key_technologies: project.technologies
    };
  }

  /**
   * Generate AI pitch draft
   */
  async generatePitchDraft(projectId, userId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { 
        owner_id: true, 
        title: true, 
        description: true, 
        technologies: true,
        problem_solved: true
      }
    });

    if (!project) throw new Error('Project not found');
    if (project.owner_id !== userId) throw new Error('You do not own this project');

    const pitch = {
      title: project.title,
      tagline: `Revolutionizing ${project.technologies[0] || 'technology'} with ${project.title}`,
      problem: project.problem_solved || "This project addresses a significant market need",
      solution: project.description.substring(0, 300),
      technology_stack: project.technologies,
      market_opportunity: "Growing market with significant potential",
      traction: "Early stage with promising metrics",
      team: "Experienced developers with proven track record",
      ask: "Seeking funding to accelerate development and market reach"
    };

    return pitch;
  }

  /**
   * Generate project description from keywords
   */
  async generateDescription(keywords) {
    if (!keywords || keywords.length === 0) {
      throw new Error('Keywords are required');
    }

    const description = `This project focuses on ${keywords.join(', ')}. It leverages cutting-edge technology to deliver innovative solutions. The platform is designed to be scalable, secure, and user-friendly.`;

    return {
      description: description,
      keywords: keywords
    };
  }

  /**
   * Find collaborators by skill match
   */
  async findBySkillMatch(skill, userId, limit = 10) {
    if (!skill) throw new Error('Skill is required');

    const users = await prisma.user.findMany({
      where: {
        id: { not: userId },
        is_active: true,
        skills: { has: skill }
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        skills: true,
        reputation_score: true,
        projects: {
          where: { visibility: 'public' },
          take: 3,
          select: { title: true, slug: true }
        }
      },
      take: limit,
      orderBy: { reputation_score: 'desc' }
    });

    return users;
  }
}

module.exports = new AIService();