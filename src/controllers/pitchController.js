const sendResponse = require('../utils/sendResponse');
const ApiError = require('../utils/ApiError');
const pitchService = require('../services/pitchService');

/**
 * Create pitch presentation
 */
const createPitch = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const { market_analysis, roadmap, revenue_model, visibility } = req.body;

    const pitch = await pitchService.createPitch(
      parseInt(project_id),
      req.user.id,
      { market_analysis, roadmap, revenue_model, visibility }
    );

    sendResponse(res, 201, pitch, 'Pitch created successfully');
  } catch (err) {
    if (err.message === 'Project not found') {
      return next(new ApiError(404, err.message));
    }
    if (err.message === 'You do not own this project') {
      return next(new ApiError(403, err.message));
    }
    if (err.message === 'Pitch already exists for this project') {
      return next(new ApiError(409, err.message));
    }
    next(err);
  }
};

/**
 * Get pitch presentation
 */
const getPitch = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const pitch = await pitchService.getPitch(
      parseInt(project_id),
      req.user?.id
    );
    sendResponse(res, 200, pitch);
  } catch (err) {
    if (err.message === 'No pitch found for this project') {
      return next(new ApiError(404, err.message));
    }
    if (err.message === 'This pitch is private') {
      return next(new ApiError(403, err.message));
    }
    next(err);
  }
};

/**
 * Update pitch content
 */
const updatePitch = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const { market_analysis, roadmap, revenue_model } = req.body;

    const updated = await pitchService.updatePitch(
      parseInt(project_id),
      req.user.id,
      { market_analysis, roadmap, revenue_model }
    );

    sendResponse(res, 200, updated, 'Pitch updated successfully');
  } catch (err) {
    if (err.message === 'No pitch found for this project') {
      return next(new ApiError(404, err.message));
    }
    if (err.message === 'You do not own this pitch') {
      return next(new ApiError(403, err.message));
    }
    next(err);
  }
};

/**
 * Add market analysis
 */
const addMarketAnalysis = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const analysisData = req.body;

    const marketAnalysis = await pitchService.addMarketAnalysis(
      parseInt(project_id),
      req.user.id,
      analysisData
    );

    sendResponse(res, 200, marketAnalysis, 'Market analysis added');
  } catch (err) {
    if (err.message === 'No pitch found for this project') {
      return next(new ApiError(404, err.message));
    }
    if (err.message === 'You do not own this pitch') {
      return next(new ApiError(403, err.message));
    }
    next(err);
  }
};

/**
 * Add roadmap
 */
const addRoadmap = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const roadmapData = req.body;

    const roadmap = await pitchService.addRoadmap(
      parseInt(project_id),
      req.user.id,
      roadmapData
    );

    sendResponse(res, 200, roadmap, 'Roadmap added');
  } catch (err) {
    if (err.message === 'No pitch found for this project') {
      return next(new ApiError(404, err.message));
    }
    if (err.message === 'You do not own this pitch') {
      return next(new ApiError(403, err.message));
    }
    next(err);
  }
};

/**
 * Add revenue model
 */
const addRevenueModel = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const revenueData = req.body;

    const revenueModel = await pitchService.addRevenueModel(
      parseInt(project_id),
      req.user.id,
      revenueData
    );

    sendResponse(res, 200, revenueModel, 'Revenue model added');
  } catch (err) {
    if (err.message === 'No pitch found for this project') {
      return next(new ApiError(404, err.message));
    }
    if (err.message === 'You do not own this pitch') {
      return next(new ApiError(403, err.message));
    }
    next(err);
  }
};

/**
 * Export pitch as PDF
 */
const exportPitchPDF = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const result = await pitchService.exportPitchAsPDF(
      parseInt(project_id),
      req.user.id
    );

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename=${result.filename}`);
    res.send(result.html);
  } catch (err) {
    if (err.message === 'No pitch found for this project') {
      return next(new ApiError(404, err.message));
    }
    if (err.message === 'You do not own this pitch') {
      return next(new ApiError(403, err.message));
    }
    next(err);
  }
};

/**
 * Toggle pitch visibility
 */
const togglePitchVisibility = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const result = await pitchService.toggleVisibility(
      parseInt(project_id),
      req.user.id
    );

    sendResponse(res, 200, result, result.message);
  } catch (err) {
    if (err.message === 'No pitch found for this project') {
      return next(new ApiError(404, err.message));
    }
    if (err.message === 'You do not own this pitch') {
      return next(new ApiError(403, err.message));
    }
    next(err);
  }
};

module.exports = {
  createPitch,
  getPitch,
  updatePitch,
  addMarketAnalysis,
  addRoadmap,
  addRevenueModel,
  exportPitchPDF,
  togglePitchVisibility,
};