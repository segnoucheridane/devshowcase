const sendResponse = require('../utils/sendResponse');
const ApiError = require('../utils/ApiError');
const searchService = require('../services/searchService');


 //Search projects with filters
 
const searchProjects = async (req, res, next) => {
  try {
    const {
      q,
      technology,
      industry,
      status,
      minViews,
      maxViews,
      minFunding,
      maxFunding,
      sort,
      page,
      limit,
    } = req.query;

    const result = await searchService.searchProjects({
      q,
      technology,
      industry,
      status,
      minViews,
      maxViews,
      minFunding,
      maxFunding,
      sort,
      page,
      limit,
    });

    sendResponse(res, 200, result.projects, null, {
      pagination: result.pagination,
      query: { q, technology, industry, status, sort },
    });
  } catch (err) {
    next(err);
  }
};


 //Get all available search filter options
 
const getFilterOptions = async (req, res, next) => {
  try {
    const filters = await searchService.getFilterOptions();
    sendResponse(res, 200, filters);
  } catch (err) {
    next(err);
  }
};


//Get trending projects
 
const getTrendingProjects = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const trending = await searchService.getTrendingProjects(parseInt(limit));
    sendResponse(res, 200, trending);
  } catch (err) {
    next(err);
  }
};


 //Get personalized recommendations for current user
 
const getPersonalizedRecommendations = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const recommendations = await searchService.getPersonalizedRecommendations(
      req.user.id,
      parseInt(limit)
    );
    sendResponse(res, 200, recommendations);
  } catch (err) {
    next(err);
  }
};


 //Get all project categories
 
const getCategories = async (req, res, next) => {
  try {
    const categories = await searchService.getCategories();
    sendResponse(res, 200, categories);
  } catch (err) {
    next(err);
  }
};

 //Get trending technology tags
 
const getTrendingTags = async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;
    const tags = await searchService.getTrendingTags(parseInt(limit));
    sendResponse(res, 200, tags);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  searchProjects,
  getFilterOptions,
  getTrendingProjects,
  getPersonalizedRecommendations,
  getCategories,
  getTrendingTags,
};