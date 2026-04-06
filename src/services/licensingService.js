const { prisma } = require('../config/prisma');

class LicensingService {
  /**
   * Request ownership verification
   */
  async requestVerification(projectId, ownerId) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { owner_id: true }
    });

    if (!project) throw new Error('Project not found');
    if (project.owner_id !== ownerId) throw new Error('You do not own this project');

    const existing = await prisma.ownershipVerification.findUnique({
      where: { project_id: projectId }
    });

    if (existing) {
      throw new Error('Verification already requested');
    }

    const verification = await prisma.ownershipVerification.create({
      data: {
        project_id: projectId,
        owner_id: ownerId,
        status: 'pending'
      }
    });

    return verification;
  }

  /**
   * Get ownership verification status
   */
  async getVerificationStatus(projectId) {
    const verification = await prisma.ownershipVerification.findUnique({
      where: { project_id: projectId },
      include: {
        project: {
          select: { title: true, owner: { select: { username: true } } }
        }
      }
    });

    if (!verification) {
      return { status: 'not_requested', project_id: projectId };
    }

    return verification;
  }

  /**
   * Add blockchain proof
   */
  async addBlockchainProof(projectId, ownerId, blockchainHash) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { owner_id: true }
    });

    if (!project) throw new Error('Project not found');
    if (project.owner_id !== ownerId) throw new Error('You do not own this project');

    const verification = await prisma.ownershipVerification.upsert({
      where: { project_id: projectId },
      update: {
        blockchain_hash: blockchainHash,
        status: 'verified',
        verified_at: new Date()
      },
      create: {
        project_id: projectId,
        owner_id: ownerId,
        blockchain_hash: blockchainHash,
        status: 'verified',
        verified_at: new Date()
      }
    });

    return verification;
  }

  /**
   * Get license templates
   */
  async getLicenseTemplates() {
    const templates = await prisma.licenseTemplate.findMany({
      orderBy: { name: 'asc' }
    });
    return templates;
  }

  /**
   * Apply license to project
   */
  async applyLicense(projectId, ownerId, licenseId, customTerms = null) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { owner_id: true }
    });

    if (!project) throw new Error('Project not found');
    if (project.owner_id !== ownerId) throw new Error('You do not own this project');

    const license = await prisma.licenseTemplate.findUnique({
      where: { id: licenseId }
    });

    if (!license) throw new Error('License template not found');

    const projectLicense = await prisma.projectLicense.upsert({
      where: { project_id: projectId },
      update: {
        license_id: licenseId,
        custom_terms: customTerms
      },
      create: {
        project_id: projectId,
        license_id: licenseId,
        custom_terms: customTerms
      }
    });

    return projectLicense;
  }

  /**
   * Get project license
   */
  async getProjectLicense(projectId) {
    const license = await prisma.projectLicense.findUnique({
      where: { project_id: projectId },
      include: {
        license: true
      }
    });

    return license;
  }

  /**
   * Generate license for purchase
   */
  async generatePurchaseLicense(listingId, sellerId, buyerId) {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { project: true }
    });

    if (!listing) throw new Error('Listing not found');
    if (listing.seller_id !== sellerId) throw new Error('You do not own this listing');

    const licenseKey = this.generateLicenseKey();
    const licenseContent = `License for ${listing.title}\n\nGranted to: User ${buyerId}\nDate: ${new Date().toISOString()}\nTerms: Standard commercial license`;

    return {
      license_key: licenseKey,
      license_content: licenseContent
    };
  }

  /**
   * Download license file
   */
  async downloadLicense(licenseId, userId) {
    const purchase = await prisma.purchase.findUnique({
      where: { id: licenseId },
      include: {
        listing: true
      }
    });

    if (!purchase) throw new Error('License not found');
    if (purchase.buyer_id !== userId && purchase.seller_id !== userId) {
      throw new Error('You do not have access to this license');
    }

    return {
      license_key: purchase.license_key,
      content: `License for ${purchase.listing.title}\n\nLicense Key: ${purchase.license_key}\nPurchase Date: ${purchase.purchased_at}\nAmount: $${purchase.amount}`
    };
  }

  /**
   * Generate license key
   */
  generateLicenseKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let license = '';
    for (let i = 0; i < 32; i++) {
      if (i > 0 && i % 8 === 0) license += '-';
      license += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return license;
  }
}

module.exports = new LicensingService();