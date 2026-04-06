const { prisma } = require('../config/prisma');

class PitchService {
  /**
   * Create pitch presentation
   */
  async createPitch(projectId, ownerId, data = {}) {
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

    // Check if pitch already exists
    const existing = await prisma.pitch.findUnique({
      where: { project_id: projectId }
    });

    if (existing) {
      throw new Error('Pitch already exists for this project');
    }

    // Create pitch with default structure
    const pitch = await prisma.pitch.create({
      data: {
        project_id: projectId,
        owner_id: ownerId,
        market_analysis: data.market_analysis || {
          market_size: null,
          growth_rate: null,
          target_audience: null,
          competitors: [],
        },
        roadmap: data.roadmap || {
          milestones: [],
          timeline: null,
        },
        revenue_model: data.revenue_model || {
          pricing: null,
          projected_revenue: null,
          break_even: null,
        },
        visibility: data.visibility || 'public',
      }
    });

    return pitch;
  }

  /**
   * Get pitch presentation
   */
  async getPitch(projectId, userId = null) {
    const pitch = await prisma.pitch.findUnique({
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
                reputation_score: true,
              }
            }
          }
        }
      }
    });

    if (!pitch) {
      throw new Error('No pitch found for this project');
    }

    // Check visibility
    if (pitch.visibility === 'private') {
      if (!userId || pitch.owner_id !== userId) {
        throw new Error('This pitch is private');
      }
    }

    return pitch;
  }

  /**
   * Update pitch content
   */
  async updatePitch(projectId, ownerId, data) {
    const pitch = await prisma.pitch.findUnique({
      where: { project_id: projectId }
    });

    if (!pitch) {
      throw new Error('No pitch found for this project');
    }

    if (pitch.owner_id !== ownerId) {
      throw new Error('You do not own this pitch');
    }

    const updated = await prisma.pitch.update({
      where: { project_id: projectId },
      data: {
        market_analysis: data.market_analysis !== undefined ? data.market_analysis : undefined,
        roadmap: data.roadmap !== undefined ? data.roadmap : undefined,
        revenue_model: data.revenue_model !== undefined ? data.revenue_model : undefined,
      }
    });

    return updated;
  }

  /**
   * Add market analysis section
   */
  async addMarketAnalysis(projectId, ownerId, analysisData) {
    const pitch = await prisma.pitch.findUnique({
      where: { project_id: projectId }
    });

    if (!pitch) {
      throw new Error('No pitch found for this project');
    }

    if (pitch.owner_id !== ownerId) {
      throw new Error('You do not own this pitch');
    }

    const currentAnalysis = pitch.market_analysis || {};
    const updatedAnalysis = { ...currentAnalysis, ...analysisData };

    const updated = await prisma.pitch.update({
      where: { project_id: projectId },
      data: { market_analysis: updatedAnalysis }
    });

    return updated.market_analysis;
  }

  /**
   * Add roadmap section
   */
  async addRoadmap(projectId, ownerId, roadmapData) {
    const pitch = await prisma.pitch.findUnique({
      where: { project_id: projectId }
    });

    if (!pitch) {
      throw new Error('No pitch found for this project');
    }

    if (pitch.owner_id !== ownerId) {
      throw new Error('You do not own this pitch');
    }

    const currentRoadmap = pitch.roadmap || {};
    const updatedRoadmap = { ...currentRoadmap, ...roadmapData };

    const updated = await prisma.pitch.update({
      where: { project_id: projectId },
      data: { roadmap: updatedRoadmap }
    });

    return updated.roadmap;
  }

  /**
   * Add revenue model section
   */
  async addRevenueModel(projectId, ownerId, revenueData) {
    const pitch = await prisma.pitch.findUnique({
      where: { project_id: projectId }
    });

    if (!pitch) {
      throw new Error('No pitch found for this project');
    }

    if (pitch.owner_id !== ownerId) {
      throw new Error('You do not own this pitch');
    }

    const currentRevenue = pitch.revenue_model || {};
    const updatedRevenue = { ...currentRevenue, ...revenueData };

    const updated = await prisma.pitch.update({
      where: { project_id: projectId },
      data: { revenue_model: updatedRevenue }
    });

    return updated.revenue_model;
  }

  /**
   * Export pitch as PDF (generates HTML content)
   */
  async exportPitchAsPDF(projectId, ownerId) {
    const pitch = await this.getPitch(projectId, ownerId);

    if (pitch.owner_id !== ownerId) {
      throw new Error('You do not own this pitch');
    }

    // Generate HTML content for PDF
    const html = this.generatePitchHTML(pitch);
    
    return {
      html,
      filename: `pitch_${pitch.project.title.replace(/\s+/g, '_')}.html`,
    };
  }

  /**
   * Toggle pitch visibility
   */
  async toggleVisibility(projectId, ownerId) {
    const pitch = await prisma.pitch.findUnique({
      where: { project_id: projectId }
    });

    if (!pitch) {
      throw new Error('No pitch found for this project');
    }

    if (pitch.owner_id !== ownerId) {
      throw new Error('You do not own this pitch');
    }

    const newVisibility = pitch.visibility === 'public' ? 'private' : 'public';

    const updated = await prisma.pitch.update({
      where: { project_id: projectId },
      data: { visibility: newVisibility }
    });

    return {
      visibility: updated.visibility,
      message: `Pitch is now ${newVisibility}`,
    };
  }

  /**
   * Generate HTML for PDF export
   */
  generatePitchHTML(pitch) {
    const marketAnalysis = pitch.market_analysis || {};
    const roadmap = pitch.roadmap || {};
    const revenueModel = pitch.revenue_model || {};

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${pitch.project.title} - Pitch Presentation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
          h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
          h2 { color: #666; margin-top: 30px; }
          .section { margin-bottom: 30px; }
          .label { font-weight: bold; width: 200px; display: inline-block; }
          .value { margin-left: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>${pitch.project.title}</h1>
        <p><strong>Created by:</strong> ${pitch.project.owner.username}</p>
        <p><strong>Reputation Score:</strong> ${pitch.project.owner.reputation_score}</p>
        
        <div class="section">
          <h2>Project Description</h2>
          <p>${pitch.project.description}</p>
          <p><strong>Technologies:</strong> ${pitch.project.technologies.join(', ')}</p>
        </div>

        <div class="section">
          <h2>Market Analysis</h2>
          <p><span class="label">Market Size:</span> ${marketAnalysis.market_size || 'Not specified'}</p>
          <p><span class="label">Growth Rate:</span> ${marketAnalysis.growth_rate || 'Not specified'}</p>
          <p><span class="label">Target Audience:</span> ${marketAnalysis.target_audience || 'Not specified'}</p>
          <p><span class="label">Competitors:</span> ${marketAnalysis.competitors?.join(', ') || 'Not specified'}</p>
        </div>

        <div class="section">
          <h2>Roadmap</h2>
          <p><span class="label">Timeline:</span> ${roadmap.timeline || 'Not specified'}</p>
          <h3>Milestones</h3>
          <ul>
            ${roadmap.milestones?.map(m => `<li>${m}</li>`).join('') || '<li>No milestones specified</li>'}
          </ul>
        </div>

        <div class="section">
          <h2>Revenue Model</h2>
          <p><span class="label">Pricing:</span> ${revenueModel.pricing || 'Not specified'}</p>
          <p><span class="label">Projected Revenue:</span> ${revenueModel.projected_revenue || 'Not specified'}</p>
          <p><span class="label">Break-even Point:</span> ${revenueModel.break_even || 'Not specified'}</p>
        </div>

        <div class="section">
          <h2>Contact Information</h2>
          <p>For investment inquiries, please contact the project owner through the DevShowcase platform.</p>
        </div>

        <hr>
        <p style="font-size: 12px; color: #999;">Generated by DevShowcase Platform</p>
      </body>
      </html>
    `;
  }
}

module.exports = new PitchService();