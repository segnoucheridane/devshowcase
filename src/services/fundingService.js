const { prisma } = require('../config/prisma');



class FundingService {
  /**
   * Create a funding request for a project
   */
  async createFundingRequest(projectId, ownerId, data) {
    const { goal_amount, deadline, description } = data;

    if (!goal_amount || goal_amount <= 0) {
      throw new Error('Goal amount must be a positive number');
    }

    if (!deadline) {
      throw new Error('Deadline is required');
    }

    // Check if project exists and user owns it
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { owner_id: true, title: true }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    if (project.owner_id !== ownerId) {
      throw new Error('You do not own this project');
    }

    // Check if funding request already exists
    const existing = await prisma.fundingRequest.findUnique({
      where: { project_id: projectId }
    });

    if (existing) {
      throw new Error('Funding request already exists for this project');
    }

    // Create funding request
    const fundingRequest = await prisma.fundingRequest.create({
      data: {
        project_id: projectId,
        owner_id: ownerId,
        goal_amount,
        deadline: new Date(deadline),
        description: description || null,
        status: 'active',
      }
    });

    // Update project to mark funding open
    await prisma.project.update({
      where: { id: projectId },
      data: { is_funding_open: true }
    });

    return fundingRequest;
  }

  /**
   * Get funding details for a project
   */
  async getFundingDetails(projectId) {
    const fundingRequest = await prisma.fundingRequest.findUnique({
      where: { project_id: projectId },
      include: {
        project: {
          select: {
            title: true,
            slug: true,
            owner: {
              select: {
                id: true,
                username: true,
                avatar: true,
              }
            }
          }
        },
        investments: {
          where: { status: 'completed' },
          select: {
            amount: true,
            type: true,
            completed_at: true,
            investor: {
              select: {
                id: true,
                username: true,
                avatar: true,
              }
            }
          },
          orderBy: { completed_at: 'desc' }
        }
      }
    });

    if (!fundingRequest) {
      return null;
    }

    // Calculate percentage funded
    const percentage = (fundingRequest.current_amount / fundingRequest.goal_amount) * 100;

    return {
      ...fundingRequest,
      percentage_funded: Math.min(percentage, 100),
      days_remaining: Math.max(0, Math.ceil((fundingRequest.deadline - new Date()) / (1000 * 60 * 60 * 24))),
    };
  }

  /**
   * Update funding request
   */
  async updateFundingRequest(projectId, ownerId, data) {
    const { goal_amount, deadline, description, status } = data;

    const fundingRequest = await prisma.fundingRequest.findUnique({
      where: { project_id: projectId }
    });

    if (!fundingRequest) {
      throw new Error('No funding request found for this project');
    }

    if (fundingRequest.owner_id !== ownerId) {
      throw new Error('You do not own this funding request');
    }

    const updated = await prisma.fundingRequest.update({
      where: { project_id: projectId },
      data: {
        goal_amount: goal_amount !== undefined ? goal_amount : undefined,
        deadline: deadline !== undefined ? new Date(deadline) : undefined,
        description: description !== undefined ? description : undefined,
        status: status !== undefined ? status : undefined,
      }
    });

    return updated;
  }

  /**
   * Make an investment
   */
  async makeInvestment(fundingRequestId, investorId, data) {
    const { amount, type, message, transaction_id } = data;

    if (!amount || amount <= 0) {
      throw new Error('Investment amount must be positive');
    }

    const fundingRequest = await prisma.fundingRequest.findUnique({
      where: { id: fundingRequestId },
      include: {
        project: true,
        owner: true
      }
    });

    if (!fundingRequest) {
      throw new Error('Funding request not found');
    }

    if (fundingRequest.status !== 'active') {
      throw new Error('This funding request is no longer active');
    }

    if (new Date(fundingRequest.deadline) < new Date()) {
      throw new Error('Funding deadline has passed');
    }

    if (fundingRequest.owner_id === investorId) {
      throw new Error('You cannot invest in your own project');
    }

    // Check if amount would exceed goal
    const newAmount = Number(fundingRequest.current_amount) + Number(amount);
    if (newAmount > Number(fundingRequest.goal_amount)) {
      throw new Error(`Investment amount exceeds remaining goal. Max: ${fundingRequest.goal_amount - fundingRequest.current_amount}`);
    }

    // Create investment record
    const investment = await prisma.investment.create({
      data: {
        funding_request_id: fundingRequestId,
        investor_id: investorId,
        amount,
        type: type || 'investment',
        status: 'completed',
        transaction_id: transaction_id || null,
        message: message || null,
        completed_at: new Date(),
      }
    });

    // Update funding request current amount
    const updatedFundingRequest = await prisma.fundingRequest.update({
      where: { id: fundingRequestId },
      data: { current_amount: newAmount }
    });

    // Update project funding raised
    await prisma.project.update({
      where: { id: fundingRequest.project_id },
      data: { funding_raised: newAmount }
    });

    // Check if goal is reached
    if (newAmount >= Number(fundingRequest.goal_amount)) {
      await prisma.fundingRequest.update({
        where: { id: fundingRequestId },
        data: { status: 'funded' }
      });
    }

    // Send notification to project owner
    await notificationService.notifyFundingReceived(
      fundingRequest.owner_id,
      fundingRequest.project_id,
      fundingRequest.project.title,
      amount,
      `Investor ${investorId}` // In real app, get investor name
    );

    return {
      investment,
      fundingRequest: updatedFundingRequest,
    };
  }

  /**
   * Sponsor a project (one-time donation)
   */
  async sponsorProject(projectId, sponsorId, data) {
    const { amount, message, transaction_id } = data;

    if (!amount || amount <= 0) {
      throw new Error('Sponsorship amount must be positive');
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { owner_id: true, title: true }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    if (project.owner_id === sponsorId) {
      throw new Error('You cannot sponsor your own project');
    }

    // Create sponsorship as an investment with type 'sponsorship'
    const sponsorship = await prisma.investment.create({
      data: {
        funding_request_id: null, // Sponsorships don't require a funding request
        investor_id: sponsorId,
        amount,
        type: 'sponsorship',
        status: 'completed',
        transaction_id: transaction_id || null,
        message: message || null,
        completed_at: new Date(),
      }
    });

    // Update project funding raised
    await prisma.project.update({
      where: { id: projectId },
      data: { funding_raised: { increment: amount } }
    });

    // Send notification to project owner
    await notificationService.notifyFundingReceived(
      project.owner_id,
      projectId,
      project.title,
      amount,
      `Sponsor ${sponsorId}`
    );

    return sponsorship;
  }

  /**
   * Get backers for a project
   */
  async getBackers(projectId) {
    const investments = await prisma.investment.findMany({
      where: {
        funding_request: {
          project_id: projectId
        },
        status: 'completed'
      },
      include: {
        investor: {
          select: {
            id: true,
            username: true,
            avatar: true,
          }
        }
      },
      orderBy: { completed_at: 'desc' }
    });

    // Also get sponsors (investments without funding_request)
    const sponsors = await prisma.investment.findMany({
      where: {
        funding_request_id: null,
        type: 'sponsorship',
        status: 'completed',
        investor: {
          projects: {
            some: { id: projectId }
          }
        }
      },
      include: {
        investor: {
          select: {
            id: true,
            username: true,
            avatar: true,
          }
        }
      },
      orderBy: { completed_at: 'desc' }
    });

    return [...investments, ...sponsors];
  }

  /**
   * Get user's investment history
   */
  async getUserInvestments(userId) {
    const investments = await prisma.investment.findMany({
      where: { investor_id: userId },
      include: {
        fundingRequest: {
          include: {
            project: {
              select: {
                id: true,
                title: true,
                slug: true,
                thumbnail_url: true,
              }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return investments;
  }

  /**
   * Get investment portfolio summary
   */
  async getPortfolioSummary(userId) {
    const investments = await prisma.investment.findMany({
      where: {
        investor_id: userId,
        status: 'completed'
      }
    });

    const total_invested = investments.reduce((sum, inv) => sum + Number(inv.amount), 0);
    const total_investments = investments.length;
    const total_sponsorships = investments.filter(i => i.type === 'sponsorship').length;
    const total_equity_investments = investments.filter(i => i.type === 'investment').length;

    // Group by project
    const projectInvestments = {};
    for (const inv of investments) {
      if (inv.funding_request_id) {
        const key = inv.funding_request_id;
        if (!projectInvestments[key]) {
          projectInvestments[key] = 0;
        }
        projectInvestments[key] += Number(inv.amount);
      }
    }

    return {
      total_invested,
      total_investments,
      total_sponsorships,
      total_equity_investments,
      projects_invested: Object.keys(projectInvestments).length,
    };
  }

  /**
   * Browse funding opportunities
   */
  async getFundingOpportunities(filters = {}, pagination = {}) {
    const {
      min_goal,
      max_goal,
      industry,
      technology,
      sort = 'deadline_asc',
      page = 1,
      limit = 12,
    } = filters;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    let where = {
      status: 'active',
      deadline: { gt: new Date() },
    };

    if (min_goal || max_goal) {
      where.goal_amount = {};
      if (min_goal) where.goal_amount.gte = parseFloat(min_goal);
      if (max_goal) where.goal_amount.lte = parseFloat(max_goal);
    }

    let orderBy = {};
    switch (sort) {
      case 'deadline_asc':
        orderBy = { deadline: 'asc' };
        break;
      case 'goal_asc':
        orderBy = { goal_amount: 'asc' };
        break;
      case 'goal_desc':
        orderBy = { goal_amount: 'desc' };
        break;
      case 'percentage_asc':
        orderBy = { current_amount: 'asc' };
        break;
      default:
        orderBy = { deadline: 'asc' };
    }

    const fundingRequests = await prisma.fundingRequest.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        project: {
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
        }
      }
    });

    // Filter by industry/technology (post-query)
    let filtered = fundingRequests;
    if (industry || technology) {
      filtered = fundingRequests.filter(fr => {
        const techMatch = technology ? fr.project.technologies?.includes(technology) : true;
        const indMatch = industry ? fr.project.industries?.includes(industry) : true;
        return techMatch && indMatch;
      });
    }

    const total = await prisma.fundingRequest.count({ where });

    // Add calculated fields
    const opportunities = filtered.map(fr => ({
      ...fr,
      percentage_funded: (Number(fr.current_amount) / Number(fr.goal_amount)) * 100,
      days_remaining: Math.max(0, Math.ceil((fr.deadline - new Date()) / (1000 * 60 * 60 * 24))),
    }));

    return {
      opportunities,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / take),
        limit: take,
      },
    };
  }
}

module.exports = new FundingService();