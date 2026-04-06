const { prisma } = require('../config/prisma');

class MarketplaceService {
  /**
   * Set or update pricing for a project
   */
  async setProjectPricing(projectId, sellerId, pricingData) {
    const { price, price_type, currency } = pricingData;

    if (!price || price <= 0) {
      throw new Error('Price must be a positive number');
    }

    const validPriceTypes = ['fixed', 'subscription', 'license'];
    if (!validPriceTypes.includes(price_type)) {
      throw new Error(`Price type must be one of: ${validPriceTypes.join(', ')}`);
    }

    // Check if project exists and user owns it
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { owner_id: true, title: true }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    if (project.owner_id !== sellerId) {
      throw new Error('You do not own this project');
    }

    // Upsert listing (create or update)
    const listing = await prisma.listing.upsert({
      where: { project_id: projectId },
      update: {
        price,
        price_type,
        currency: currency || 'USD',
        title: project.title,
        description: pricingData.description || null,
        status: 'active',
      },
      create: {
        project_id: projectId,
        seller_id: sellerId,
        title: project.title,
        description: pricingData.description || null,
        price,
        price_type,
        currency: currency || 'USD',
        status: 'active',
      }
    });

    // Update project to mark as for sale
    await prisma.project.update({
      where: { id: projectId },
      data: { is_for_sale: true }
    });

    return listing;
  }

  /**
   * Get pricing information for a project
   */
  async getProjectPricing(projectId) {
    const listing = await prisma.listing.findUnique({
      where: { project_id: projectId },
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            reputation_score: true,
          }
        }
      }
    });

    return listing;
  }

  /**
   * Update pricing model
   */
  async updateProjectPricing(projectId, sellerId, pricingData) {
    const { price, price_type, currency, status } = pricingData;

    const listing = await prisma.listing.findUnique({
      where: { project_id: projectId }
    });

    if (!listing) {
      throw new Error('No pricing set for this project');
    }

    if (listing.seller_id !== sellerId) {
      throw new Error('You do not own this listing');
    }

    const updatedListing = await prisma.listing.update({
      where: { project_id: projectId },
      data: {
        price: price !== undefined ? price : undefined,
        price_type: price_type !== undefined ? price_type : undefined,
        currency: currency !== undefined ? currency : undefined,
        status: status !== undefined ? status : undefined,
      }
    });

    // Update project for_sale status
    if (status === 'inactive') {
      await prisma.project.update({
        where: { id: projectId },
        data: { is_for_sale: false }
      });
    }

    return updatedListing;
  }

  /**
   * Browse all marketplace listings
   */
  async browseListings(filters = {}, pagination = {}) {
    const {
      price_type,
      min_price,
      max_price,
      technology,
      industry,
      sort = 'newest',
      page = 1,
      limit = 12,
    } = filters;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    let where = { status: 'active' };

    if (price_type) {
      where.price_type = price_type;
    }

    if (min_price || max_price) {
      where.price = {};
      if (min_price) where.price.gte = parseFloat(min_price);
      if (max_price) where.price.lte = parseFloat(max_price);
    }

    // Join with projects for technology/industry filters
    let orderBy = {};
    if (sort === 'newest') orderBy = { created_at: 'desc' };
    if (sort === 'price_low') orderBy = { price: 'asc' };
    if (sort === 'price_high') orderBy = { price: 'desc' };
    if (sort === 'popular') orderBy = { views: 'desc' };

    const listings = await prisma.listing.findMany({
      where,
      skip,
      take,
      orderBy,
      include: {
        project: {
          include: {
            owner: {
              select: {
                username: true,
                avatar: true,
                reputation_score: true,
              }
            }
          }
        },
        seller: {
          select: {
            id: true,
            username: true,
            reputation_score: true,
          }
        }
      }
    });

    // Filter by technology/industry if specified (post-query filtering)
    let filteredListings = listings;
    if (technology || industry) {
      filteredListings = listings.filter(listing => {
        const techMatch = technology ? listing.project.technologies?.includes(technology) : true;
        const indMatch = industry ? listing.project.industries?.includes(industry) : true;
        return techMatch && indMatch;
      });
    }

    const total = await prisma.listing.count({ where });

    return {
      listings: filteredListings,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / take),
        limit: take,
      },
    };
  }

  /**
   * Get single listing by ID
   */
  async getListing(listingId) {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
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
            },
            stages: true,
            milestones: true,
          }
        },
        seller: {
          select: {
            id: true,
            username: true,
            reputation_score: true,
          }
        }
      }
    });

    if (!listing) {
      throw new Error('Listing not found');
    }

    // Increment views
    await prisma.listing.update({
      where: { id: listingId },
      data: { views: { increment: 1 } }
    });

    return listing;
  }

  /**
   * Purchase a listing
   */
  async purchaseListing(listingId, buyerId, transactionId = null) {
    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        project: true,
        seller: true,
      }
    });

    if (!listing) {
      throw new Error('Listing not found');
    }

    if (listing.status !== 'active') {
      throw new Error('This listing is no longer available');
    }

    if (listing.seller_id === buyerId) {
      throw new Error('You cannot purchase your own listing');
    }

    // Create purchase record
    const purchase = await prisma.purchase.create({
      data: {
        listing_id: listingId,
        buyer_id: buyerId,
        seller_id: listing.seller_id,
        amount: listing.price,
        currency: listing.currency,
        status: 'completed',
        transaction_id: transactionId,
        license_key: this.generateLicenseKey(),
      },
      include: {
        listing: {
          include: {
            project: true
          }
        }
      }
    });

    // Update listing status to sold
    await prisma.listing.update({
      where: { id: listingId },
      data: { status: 'sold' }
    });

    // Update project is_for_sale status
    await prisma.project.update({
      where: { id: listing.project_id },
      data: { is_for_sale: false }
    });

    return purchase;
  }

  /**
   * Get user's purchase history
   */
  async getUserPurchases(userId) {
    const purchases = await prisma.purchase.findMany({
      where: { buyer_id: userId },
      orderBy: { purchased_at: 'desc' },
      include: {
        listing: {
          include: {
            project: {
              select: {
                id: true,
                title: true,
                slug: true,
                thumbnail_url: true,
              }
            },
            seller: {
              select: {
                username: true,
              }
            }
          }
        }
      }
    });

    return purchases;
  }

  /**
   * Get seller's sales analytics
   */
  async getSellerSales(sellerId) {
    const [sales, totalRevenue, totalSales] = await Promise.all([
      prisma.purchase.findMany({
        where: { seller_id: sellerId },
        orderBy: { purchased_at: 'desc' },
        include: {
          listing: {
            include: {
              project: {
                select: {
                  title: true,
                }
              }
            }
          },
          buyer: {
            select: {
              username: true,
            }
          }
        }
      }),
      prisma.purchase.aggregate({
        where: { seller_id: sellerId },
        _sum: { amount: true }
      }),
      prisma.purchase.count({
        where: { seller_id: sellerId }
      })
    ]);

    const listings = await prisma.listing.findMany({
      where: { seller_id: sellerId },
      orderBy: { created_at: 'desc' }
    });

    return {
      total_sales: totalSales,
      total_revenue: totalRevenue._sum.amount || 0,
      sales: sales,
      listings: listings,
    };
  }

  /**
   * Generate a unique license key
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

module.exports = new MarketplaceService();