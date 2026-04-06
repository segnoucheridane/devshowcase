const sendResponse = require('../utils/sendResponse');
const ApiError = require('../utils/ApiError');
const fundingService = require('../services/fundingService');

/**
 * Create a funding request
 */
const createFundingRequest = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const { goal_amount, deadline, description } = req.body;

    const fundingRequest = await fundingService.createFundingRequest(
      parseInt(project_id),
      req.user.id,
      { goal_amount, deadline, description }
    );

    sendResponse(res, 201, fundingRequest, 'Funding request created successfully');
  } catch (err) {
    if (err.message === 'Project not found') {
      return next(new ApiError(404, err.message));
    }
    if (err.message === 'You do not own this project') {
      return next(new ApiError(403, err.message));
    }
    if (err.message === 'Funding request already exists for this project') {
      return next(new ApiError(409, err.message));
    }
    if (err.message === 'Goal amount must be a positive number' || err.message === 'Deadline is required') {
      return next(new ApiError(400, err.message));
    }
    next(err);
  }
};

/**
 * Get funding details for a project
 */
const getFundingDetails = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const fundingDetails = await fundingService.getFundingDetails(parseInt(project_id));

    if (!fundingDetails) {
      return next(new ApiError(404, 'No funding request found for this project'));
    }

    sendResponse(res, 200, fundingDetails);
  } catch (err) {
    next(err);
  }
};

/**
 * Update funding request
 */
const updateFundingRequest = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const { goal_amount, deadline, description, status } = req.body;

    const updated = await fundingService.updateFundingRequest(
      parseInt(project_id),
      req.user.id,
      { goal_amount, deadline, description, status }
    );

    sendResponse(res, 200, updated, 'Funding request updated');
  } catch (err) {
    if (err.message === 'No funding request found for this project') {
      return next(new ApiError(404, err.message));
    }
    if (err.message === 'You do not own this funding request') {
      return next(new ApiError(403, err.message));
    }
    next(err);
  }
};

/**
 * Make an investment
 */
const makeInvestment = async (req, res, next) => {
  try {
    const { funding_request_id } = req.params;
    const { amount, type, message, transaction_id } = req.body;

    const result = await fundingService.makeInvestment(
      parseInt(funding_request_id),
      req.user.id,
      { amount, type, message, transaction_id }
    );

    sendResponse(res, 200, result, 'Investment successful!');
  } catch (err) {
    if (err.message === 'Funding request not found') {
      return next(new ApiError(404, err.message));
    }
    if (err.message === 'You cannot invest in your own project') {
      return next(new ApiError(403, err.message));
    }
    if (err.message.includes('exceeds remaining goal')) {
      return next(new ApiError(400, err.message));
    }
    next(err);
  }
};

/**
 * Sponsor a project
 */
const sponsorProject = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const { amount, message, transaction_id } = req.body;

    const sponsorship = await fundingService.sponsorProject(
      parseInt(project_id),
      req.user.id,
      { amount, message, transaction_id }
    );

    sendResponse(res, 200, sponsorship, 'Thank you for your sponsorship!');
  } catch (err) {
    if (err.message === 'Project not found') {
      return next(new ApiError(404, err.message));
    }
    if (err.message === 'You cannot sponsor your own project') {
      return next(new ApiError(403, err.message));
    }
    if (err.message === 'Sponsorship amount must be positive') {
      return next(new ApiError(400, err.message));
    }
    next(err);
  }
};

/**
 * Get backers for a project
 */
const getBackers = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const backers = await fundingService.getBackers(parseInt(project_id));
    sendResponse(res, 200, backers);
  } catch (err) {
    next(err);
  }
};

/**
 * Get user's investment history
 */
const getUserInvestments = async (req, res, next) => {
  try {
    const investments = await fundingService.getUserInvestments(req.user.id);
    sendResponse(res, 200, investments);
  } catch (err) {
    next(err);
  }
};

/**
 * Get investment portfolio summary
 */
const getPortfolioSummary = async (req, res, next) => {
  try {
    const summary = await fundingService.getPortfolioSummary(req.user.id);
    sendResponse(res, 200, summary);
  } catch (err) {
    next(err);
  }
};

/**
 * Browse funding opportunities
 */
const getFundingOpportunities = async (req, res, next) => {
  try {
    const {
      min_goal,
      max_goal,
      industry,
      technology,
      sort,
      page,
      limit,
    } = req.query;

    const result = await fundingService.getFundingOpportunities({
      min_goal,
      max_goal,
      industry,
      technology,
      sort,
      page,
      limit,
    });

    sendResponse(res, 200, result.opportunities, null, {
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createFundingRequest,
  getFundingDetails,
  updateFundingRequest,
  makeInvestment,
  sponsorProject,
  getBackers,
  getUserInvestments,
  getPortfolioSummary,
  getFundingOpportunities,
};