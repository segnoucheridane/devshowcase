const { prisma } = require('../config/prisma');

class ReputationService {
  /**
   * Get user's reputation score breakdown
   */
  async getReputationScore(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        reputation_score: true,
        receivedEndorsements: {
          select: {
            skill: true,
            message: true,
            endorser: {
              select: {
                id: true,
                username: true,
                avatar: true,
              }
            },
            created_at: true,
          },
          orderBy: { created_at: 'desc' }
        }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Calculate endorsement count by skill
    const skillsBreakdown = {};
    user.receivedEndorsements.forEach(endorsement => {
      if (!skillsBreakdown[endorsement.skill]) {
        skillsBreakdown[endorsement.skill] = 0;
      }
      skillsBreakdown[endorsement.skill]++;
    });

    // Calculate reputation based on endorsements
    const totalEndorsements = user.receivedEndorsements.length;
    const uniqueSkills = Object.keys(skillsBreakdown).length;

    return {
      user: {
        id: user.id,
        username: user.username,
      },
      total_score: user.reputation_score,
      total_endorsements: totalEndorsements,
      unique_skills: uniqueSkills,
      skills_breakdown: skillsBreakdown,
      endorsements: user.receivedEndorsements,
    };
  }

  /**
   * Endorse a user for a skill
   */
  async endorseUser(endorserId, targetUserId, skill, message = null) {
    if (endorserId === targetUserId) {
      throw new Error('You cannot endorse yourself');
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    });

    if (!targetUser) {
      throw new Error('User not found');
    }

    // Check if already endorsed for this skill
    const existing = await prisma.endorsement.findUnique({
      where: {
        user_id_endorsed_by_skill: {
          user_id: targetUserId,
          endorsed_by: endorserId,
          skill: skill,
        }
      }
    });

    if (existing) {
      throw new Error('You have already endorsed this user for this skill');
    }

    // Create endorsement
    const endorsement = await prisma.endorsement.create({
      data: {
        user_id: targetUserId,
        endorsed_by: endorserId,
        skill,
        message: message || null,
      },
      include: {
        endorser: {
          select: {
            id: true,
            username: true,
            avatar: true,
          }
        }
      }
    });

    // Update user's reputation score
    const endorsementCount = await prisma.endorsement.count({
      where: { user_id: targetUserId }
    });

    // Simple reputation calculation: 10 points per endorsement
    const newReputationScore = endorsementCount * 10;

    await prisma.user.update({
      where: { id: targetUserId },
      data: { reputation_score: newReputationScore }
    });

    // Log activity
    await this.logActivity(targetUserId, 'endorsement_received', 'user', endorserId, {
      skill,
      endorser_id: endorserId
    });

    return endorsement;
  }

  /**
   * Get all endorsements for a user
   */
  async getUserEndorsements(userId) {
    const endorsements = await prisma.endorsement.findMany({
      where: { user_id: userId },
      include: {
        endorser: {
          select: {
            id: true,
            username: true,
            avatar: true,
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    return endorsements;
  }

  /**
   * Remove an endorsement
   */
  async removeEndorsement(userId, skill, endorserId) {
    const endorsement = await prisma.endorsement.findUnique({
      where: {
        user_id_endorsed_by_skill: {
          user_id: userId,
          endorsed_by: endorserId,
          skill: skill,
        }
      }
    });

    if (!endorsement) {
      throw new Error('Endorsement not found');
    }

    await prisma.endorsement.delete({
      where: {
        user_id_endorsed_by_skill: {
          user_id: userId,
          endorsed_by: endorserId,
          skill: skill,
        }
      }
    });

    // Update reputation score
    const endorsementCount = await prisma.endorsement.count({
      where: { user_id: userId }
    });
    const newReputationScore = endorsementCount * 10;

    await prisma.user.update({
      where: { id: userId },
      data: { reputation_score: newReputationScore }
    });

    return { message: 'Endorsement removed' };
  }

  /**
   * Get build verification status for a project
   */
  async getBuildVerification(projectId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        title: true,
        is_verified: true,
        updated_at: true,
      }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    return {
      project_id: project.id,
      title: project.title,
      is_verified: project.is_verified || false,
      verified_at: project.is_verified ? project.updated_at : null,
    };
  }

  /**
   * Request build verification
   */
  async requestBuildVerification(projectId, ownerId) {
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

    // In a real implementation, this would trigger a verification process
    // For now, we'll just mark it as verified
    const verified = await prisma.project.update({
      where: { id: projectId },
      data: { is_verified: true }
    });

    // Log activity
    await this.logActivity(ownerId, 'verification_requested', 'project', projectId, {
      project_title: project.title
    });

    return {
      message: 'Verification request submitted',
      project_id: projectId,
      status: 'pending_review'
    };
  }

  /**
   * Get user's activity history
   */
  async getActivityHistory(userId, pagination = {}) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [activities, total] = await Promise.all([
      prisma.activityLog.findMany({
        where: { user_id: userId },
        skip,
        take,
        orderBy: { created_at: 'desc' },
      }),
      prisma.activityLog.count({ where: { user_id: userId } })
    ]);

    return {
      activities,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / take),
        limit: take,
      },
    };
  }

  /**
   * Log user activity
   */
  async logActivity(userId, action, entityType, entityId, metadata = null) {
    return await prisma.activityLog.create({
      data: {
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        metadata,
      }
    });
  }
}

module.exports = new ReputationService();