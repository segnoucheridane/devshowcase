const { prisma } = require('../config/prisma');
const { Parser } = require('json2csv');

class AnalyticsService {
  /**
   * Get view count analytics for a project
   */
  async getViewAnalytics(projectId, ownerId) {
    await this.verifyProjectOwnership(projectId, ownerId);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        title: true,
        view_count: true,
        created_at: true,
      }
    });

    return {
      project_id: projectId,
      title: project.title,
      total_views: project.view_count,
      average_daily_views: Math.round(project.view_count / 30) || 0,
      created_at: project.created_at,
    };
  }

  /**
   * Get demo interaction analytics
   */
  async getDemoInteractionAnalytics(projectId, ownerId) {
    await this.verifyProjectOwnership(projectId, ownerId);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        title: true,
        demo_url: true,
      }
    });

    return {
      project_id: projectId,
      title: project.title,
      demo_url: project.demo_url,
      total_interactions: 0,
      average_session_duration: 0,
      completion_rate: 0,
    };
  }

  /**
   * Get engagement metrics
   */
  async getEngagementMetrics(projectId, ownerId) {
    await this.verifyProjectOwnership(projectId, ownerId);

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        title: true,
        like_count: true,
        collaborations: {
          where: { status: 'active' },
          select: { id: true }
        }
      }
    });

    const collaboratorCount = project.collaborations.length;

    return {
      project_id: projectId,
      title: project.title,
      likes: project.like_count,
      collaborators: collaboratorCount,
      shares: 0,
      comments: 0,
      engagement_score: this.calculateEngagementScore(project.like_count, collaboratorCount),
    };
  }

  /**
   * Get timeline insights
   */
  async getTimelineInsights(projectId, ownerId) {
    await this.verifyProjectOwnership(projectId, ownerId);

    const timeLogs = await prisma.timeLog.findMany({
      where: {
        milestone: {
          project_id: projectId
        }
      },
      include: {
        milestone: {
          include: {
            stage: true
          }
        }
      }
    });

    const totalHours = timeLogs.reduce((sum, log) => sum + Number(log.hours), 0);
    
    const stageBreakdown = {};
    timeLogs.forEach(log => {
      const stageName = log.milestone.stage.name;
      if (!stageBreakdown[stageName]) {
        stageBreakdown[stageName] = 0;
      }
      stageBreakdown[stageName] += Number(log.hours);
    });

    return {
      project_id: projectId,
      total_hours: totalHours,
      stage_breakdown: stageBreakdown,
      total_milestones: timeLogs.length,
    };
  }

  /**
   * Get user analytics summary
   */
  async getUserAnalyticsSummary(userId) {
    const projects = await prisma.project.findMany({
      where: { owner_id: userId },
      select: {
        id: true,
        title: true,
        view_count: true,
        like_count: true,
        created_at: true,
      }
    });

    const totalProjects = projects.length;
    const totalViews = projects.reduce((sum, p) => sum + p.view_count, 0);
    const totalLikes = projects.reduce((sum, p) => sum + p.like_count, 0);
    const averageViewsPerProject = totalProjects > 0 ? Math.round(totalViews / totalProjects) : 0;

    return {
      user_id: userId,
      total_projects: totalProjects,
      total_views: totalViews,
      total_likes: totalLikes,
      average_views_per_project: averageViewsPerProject,
      projects: projects,
    };
  }

  /**
   * Export analytics as CSV
   */
  async exportAnalytics(userId, format = 'csv') {
    const analytics = await this.getUserAnalyticsSummary(userId);
    
    if (format === 'csv') {
      const fields = ['id', 'title', 'view_count', 'like_count', 'created_at'];
      const opts = { fields };
      const parser = new Parser(opts);
      const csv = parser.parse(analytics.projects);
      return { data: csv, contentType: 'text/csv', filename: `analytics_${userId}.csv` };
    }
    
    return { 
      data: JSON.stringify(analytics, null, 2), 
      contentType: 'application/json', 
      filename: `analytics_${userId}.json` 
    };
  }

  /**
   * Verify project ownership
   */
  async verifyProjectOwnership(projectId, userId) {
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

    return true;
  }

  /**
   * Calculate engagement score
   */
  calculateEngagementScore(likes, collaborators) {
    let score = 0;
    score += likes * 2;
    score += collaborators * 5;
    return Math.min(score, 100);
  }
}

module.exports = new AnalyticsService();