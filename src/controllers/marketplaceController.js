const sendResponse = require('../utils/sendResponse');
const ApiError = require('../utils/ApiError');
const marketplaceService = require('../services/MarketplaceService');

/**
 * Set pricing for a project
 */
const setProjectPricing = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const { price, price_type, currency, description } = req.body;

    const listing = await marketplaceService.setProjectPricing(
      parseInt(project_id),
      req.user.id,
      { price, price_type, currency, description }
    );

    sendResponse(res, 200, listing, 'Pricing set successfully');
  } catch (err) {
    if (err.message === 'Project not found') {
      return next(new ApiError(404, err.message));
    }
    if (err.message === 'You do not own this project') {
      return next(new ApiError(403, err.message));
    }
    if (err.message === 'Price must be a positive number') {
      return next(new ApiError(400, err.message));
    }
    next(err);
  }
};

/**
 * Get project pricing
 */
const getProjectPricing = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const pricing = await marketplaceService.getProjectPricing(parseInt(project_id));

    if (!pricing) {
      return next(new ApiError(404, 'No pricing set for this project'));
    }

    sendResponse(res, 200, pricing);
  } catch (err) {
    next(err);
  }
};

/**
 * Update project pricing
 */
const updateProjectPricing = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const { price, price_type, currency, status } = req.body;

    const updated = await marketplaceService.updateProjectPricing(
      parseInt(project_id),
      req.user.id,
      { price, price_type, currency, status }
    );

    sendResponse(res, 200, updated, 'Pricing updated successfully');
  } catch (err) {
    if (err.message === 'No pricing set for this project') {
      return next(new ApiError(404, err.message));
    }
    if (err.message === 'You do not own this listing') {
      return next(new ApiError(403, err.message));
    }
    next(err);
  }
};

/**
 * Browse marketplace listings
 */
const browseListings = async (req, res, next) => {
  try {
    const {
      price_type,
      min_price,
      max_price,
      technology,
      industry,
      sort,
      page,
      limit,
    } = req.query;

    const result = await marketplaceService.browseListings({
      price_type,
      min_price,
      max_price,
      technology,
      industry,
      sort,
      page,
      limit,
    });

    sendResponse(res, 200, result.listings, null, {
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get single listing
 */
const getListing = async (req, res, next) => {
  try {
    const { listing_id } = req.params;
    const listing = await marketplaceService.getListing(parseInt(listing_id));

    sendResponse(res, 200, listing);
  } catch (err) {
    if (err.message === 'Listing not found') {
      return next(new ApiError(404, err.message));
    }
    next(err);
  }
};

/**
 * Purchase a listing
 */
const purchaseListing = async (req, res, next) => {
  try {
    const { listing_id } = req.params;
    const { transaction_id } = req.body;

    const purchase = await marketplaceService.purchaseListing(
      parseInt(listing_id),
      req.user.id,
      transaction_id
    );

    sendResponse(res, 200, purchase, 'Purchase completed successfully');
  } catch (err) {
    if (err.message === 'Listing not found') {
      return next(new ApiError(404, err.message));
    }
    if (err.message === 'This listing is no longer available') {
      return next(new ApiError(400, err.message));
    }
    if (err.message === 'You cannot purchase your own listing') {
      return next(new ApiError(403, err.message));
    }
    next(err);
  }
};

/**
 * Get user purchase history
 */
const getUserPurchases = async (req, res, next) => {
  try {
    const purchases = await marketplaceService.getUserPurchases(req.user.id);
    sendResponse(res, 200, purchases);
  } catch (err) {
    next(err);
  }
};

/**
 * Get seller sales analytics
 */
const getSellerSales = async (req, res, next) => {
  try {
    const sales = await marketplaceService.getSellerSales(req.user.id);
    sendResponse(res, 200, sales);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  setProjectPricing,
  getProjectPricing,
  updateProjectPricing,
  browseListings,
  getListing,
  purchaseListing,
  getUserPurchases,
  getSellerSales,
};