const { prisma } = require('../config/prisma');

class TimelineService {
  /**
   * Check if user owns the project
   */
  async checkProjectOwnership(projectId, userId) {
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
   * Get full timeline for a project
   */
  async getTimeline(projectId) {
    const stages = await prisma.stage.findMany({
      where: { project_id: projectId },
      orderBy: { order_index: 'asc' },
      include: {
        milestones: {
          orderBy: { order_index: 'asc' },
          include: {
            time_logs: true
          }
        }
      }
    });
    
    return stages;
  }
  
  /**
   * Create a new stage
   */
  async createStage(projectId, userId, stageData) {
    const { name, description, order_index } = stageData;
    
    const validNames = ['idea', 'planning', 'development', 'testing', 'deployment'];
    
    if (!validNames.includes(name)) {
      throw new Error(`Stage name must be one of: ${validNames.join(', ')}`);
    }
    
    await this.checkProjectOwnership(projectId, userId);
    
    const stage = await prisma.stage.create({
      data: {
        project_id: projectId,
        name,
        description: description || null,
        order_index: order_index || 0,
      }
    });
    
    return stage;
  }
  
  /**
   * Create a new milestone
   */
  async createMilestone(projectId, stageId, userId, milestoneData) {
    const { title, description, order_index, completed_at } = milestoneData;
    
    if (!title) {
      throw new Error('Milestone title is required');
    }
    
    await this.checkProjectOwnership(projectId, userId);
    
    // Check stage exists
    const stage = await prisma.stage.findFirst({
      where: { id: stageId, project_id: projectId }
    });
    
    if (!stage) {
      throw new Error('Stage not found in this project');
    }
    
    const milestone = await prisma.milestone.create({
      data: {
        stage_id: stageId,
        project_id: projectId,
        title,
        description: description || null,
        order_index: order_index || 0,
        completed_at: completed_at ? new Date(completed_at) : null,
      }
    });
    
    return milestone;
  }
  
  /**
   * Add time log to milestone
   */
  async addTimeLog(projectId, milestoneId, userId, timeLogData) {
    const { hours, note } = timeLogData;
    
    if (!hours || isNaN(hours) || Number(hours) <= 0) {
      throw new Error('Hours must be a positive number');
    }
    
    await this.checkProjectOwnership(projectId, userId);
    
    // Check milestone exists
    const milestone = await prisma.milestone.findFirst({
      where: { id: milestoneId, project_id: projectId }
    });
    
    if (!milestone) {
      throw new Error('Milestone not found in this project');
    }
    
    const timeLog = await prisma.timeLog.create({
      data: {
        milestone_id: milestoneId,
        user_id: userId,
        hours: parseFloat(hours),
        note: note || null,
      }
    });
    
    return timeLog;
  }
}

module.exports = new TimelineService();