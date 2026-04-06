const { prisma } = require('../config/prisma');

class NotificationService {
  /**
   * Create a notification
   */
  async createNotification(userId, type, title, message, data = null, actionUrl = null) {
    const notification = await prisma.notification.create({
      data: {
        user_id: userId,
        type,
        title,
        message,
        data,
        action_url: actionUrl,
      }
    });
    return notification;
  }

  /**
   * Get user's notifications
   */
  async getUserNotifications(userId, filters = {}) {
    const { page = 1, limit = 20, unreadOnly = false } = filters;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    let where = { user_id: userId };
    if (unreadOnly === 'true' || unreadOnly === true) {
      where.is_read = false;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
      }),
      prisma.notification.count({ where })
    ]);

    return {
      notifications,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / take),
        limit: take,
      },
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId, userId) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        user_id: userId,
      }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        is_read: true,
        read_at: new Date(),
      }
    });

    return updated;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId) {
    const updated = await prisma.notification.updateMany({
      where: {
        user_id: userId,
        is_read: false,
      },
      data: {
        is_read: true,
        read_at: new Date(),
      }
    });

    return { count: updated.count };
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId, userId) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        user_id: userId,
      }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await prisma.notification.delete({
      where: { id: notificationId }
    });

    return { message: 'Notification deleted' };
  }

  /**
   * Get user's notification preferences
   */
  async getPreferences(userId) {
    let preferences = await prisma.notificationPreference.findUnique({
      where: { user_id: userId }
    });

    if (!preferences) {
      // Create default preferences if none exist
      preferences = await prisma.notificationPreference.create({
        data: { user_id: userId }
      });
    }

    return preferences;
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(userId, updates) {
    const preferences = await prisma.notificationPreference.upsert({
      where: { user_id: userId },
      update: updates,
      create: { user_id: userId, ...updates },
    });

    return preferences;
  }

  // =====================================================
  // Helper methods to create specific notifications
  // =====================================================

  async notifyCollaborationInvite(userId, projectId, projectTitle, inviterName) {
    return this.createNotification(
      userId,
      'collaboration_invite',
      'Collaboration Invitation',
      `${inviterName} invited you to collaborate on "${projectTitle}"`,
      { projectId, inviterName },
      `/projects/${projectId}`
    );
  }

  async notifyCollaborationAccepted(userId, projectId, projectTitle, collaboratorName) {
    return this.createNotification(
      userId,
      'collaboration_accepted',
      'Collaboration Accepted',
      `${collaboratorName} accepted your invitation to collaborate on "${projectTitle}"`,
      { projectId, collaboratorName },
      `/projects/${projectId}/collaborators`
    );
  }

  async notifyFundingReceived(userId, projectId, projectTitle, amount, investorName) {
    return this.createNotification(
      userId,
      'funding_received',
      'Funding Received! 🎉',
      `${investorName} invested $${amount} in "${projectTitle}"`,
      { projectId, amount, investorName },
      `/projects/${projectId}/funding`
    );
  }

  async notifyPurchaseMade(userId, listingId, listingTitle, buyerName) {
    return this.createNotification(
      userId,
      'purchase_made',
      'Item Purchased! 🛒',
      `${buyerName} purchased "${listingTitle}"`,
      { listingId, buyerName },
      `/marketplace/sales`
    );
  }

  async notifyEndorsementReceived(userId, endorserName, skill) {
    return this.createNotification(
      userId,
      'endorsement_received',
      'New Endorsement! 🌟',
      `${endorserName} endorsed you for ${skill}`,
      { endorserName, skill },
      `/profile#endorsements`
    );
  }
}

module.exports = new NotificationService();