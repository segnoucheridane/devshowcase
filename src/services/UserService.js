const bcrypt = require('bcryptjs');
const { prisma } = require('../config/prisma');

class UserService {
  /**
   * Create a new user
   */
  async createUser(userData) {
    const { username, email, password, role } = userData;
    
    // Check if email exists
    const existingEmail = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });
    
    if (existingEmail) {
      throw new Error('Email already registered');
    }
    
    // Check if username exists
    const existingUsername = await prisma.user.findUnique({
      where: { username }
    });
    
    if (existingUsername) {
      throw new Error('Username already taken');
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: role || 'developer',
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        is_verified: true,
        created_at: true,
      }
    });
    
    return user;
  }
  
  /**
   * Authenticate user by email and password
   */
  async authenticateUser(email, password) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        username: true,
        email: true,
        password: true,
        role: true,
        is_active: true,
      }
    });
    
    if (!user) {
      throw new Error('Invalid email or password');
    }
    
    if (!user.is_active) {
      throw new Error('Account has been deactivated');
    }
    
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      throw new Error('Invalid email or password');
    }
    
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
  
  /**
   * Get user profile by ID
   */
  async getUserProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        bio: true,
        avatar: true,
        website: true,
        github: true,
        linkedin: true,
        skills: true,
        reputation_score: true,
        is_verified: true,
        created_at: true,
      }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  }
  
  /**
   * Update user profile
   */
  async updateUserProfile(userId, updateData) {
    const { bio, website, github, linkedin, skills } = updateData;
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        bio: bio !== undefined ? bio : undefined,
        website: website !== undefined ? website : undefined,
        github: github !== undefined ? github : undefined,
        linkedin: linkedin !== undefined ? linkedin : undefined,
        skills: skills !== undefined ? skills : undefined,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        bio: true,
        avatar: true,
        website: true,
        github: true,
        linkedin: true,
        skills: true,
        reputation_score: true,
      }
    });
    
    return updatedUser;
  }
  
  /**
   * Switch user role
   */
  async switchUserRole(userId, newRole) {
    const allowedRoles = ['user', 'developer', 'investor', 'recruiter'];
    
    if (!allowedRoles.includes(newRole)) {
      throw new Error(`Role must be one of: ${allowedRoles.join(', ')}`);
    }
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
      select: {
        id: true,
        username: true,
        role: true,
      }
    });
    
    return updatedUser;
  }
  
  /**
   * Get user's public projects
   */
  async getUserProjects(userId) {
    const projects = await prisma.project.findMany({
      where: {
        owner_id: userId,
        visibility: 'public',
      },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        status: true,
        technologies: true,
        thumbnail_url: true,
        view_count: true,
        like_count: true,
        created_at: true,
      }
    });
    
    return projects;
  }
}

module.exports = new UserService();