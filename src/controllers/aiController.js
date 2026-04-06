const sendResponse = require('../utils/sendResponse');
const ApiError = require('../utils/ApiError');
const aiService = require('../services/AiService');

const getCollaboratorSuggestions = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const suggestions = await aiService.getCollaboratorSuggestions(
      parseInt(project_id),
      req.user.id
    );
    sendResponse(res, 200, suggestions);
  } catch (err) {
    if (err.message === 'Project not found') return next(new ApiError(404, err.message));
    if (err.message === 'You do not own this project') return next(new ApiError(403, err.message));
    next(err);
  }
};

const getInvestorSuggestions = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const suggestions = await aiService.getInvestorSuggestions(
      parseInt(project_id),
      req.user.id
    );
    sendResponse(res, 200, suggestions);
  } catch (err) {
    if (err.message === 'Project not found') return next(new ApiError(404, err.message));
    if (err.message === 'You do not own this project') return next(new ApiError(403, err.message));
    next(err);
  }
};

const getProjectRecommendations = async (req, res, next) => {
  try {
    const recommendations = await aiService.getProjectRecommendations(req.user.id);
    sendResponse(res, 200, recommendations);
  } catch (err) {
    next(err);
  }
};

const getImprovementSuggestions = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const suggestions = await aiService.getImprovementSuggestions(
      parseInt(project_id),
      req.user.id
    );
    sendResponse(res, 200, suggestions);
  } catch (err) {
    if (err.message === 'Project not found') return next(new ApiError(404, err.message));
    if (err.message === 'You do not own this project') return next(new ApiError(403, err.message));
    next(err);
  }
};

const generateSummary = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const summary = await aiService.generateSummary(parseInt(project_id), req.user.id);
    sendResponse(res, 200, summary);
  } catch (err) {
    if (err.message === 'Project not found') return next(new ApiError(404, err.message));
    if (err.message === 'You do not own this project') return next(new ApiError(403, err.message));
    next(err);
  }
};

const generatePitchDraft = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const pitch = await aiService.generatePitchDraft(parseInt(project_id), req.user.id);
    sendResponse(res, 200, pitch);
  } catch (err) {
    if (err.message === 'Project not found') return next(new ApiError(404, err.message));
    if (err.message === 'You do not own this project') return next(new ApiError(403, err.message));
    next(err);
  }
};

const generateDescription = async (req, res, next) => {
  try {
    const { keywords } = req.body;
    const description = await aiService.generateDescription(keywords);
    sendResponse(res, 200, description);
  } catch (err) {
    if (err.message === 'Keywords are required') return next(new ApiError(400, err.message));
    next(err);
  }
};

const findBySkillMatch = async (req, res, next) => {
  try {
    const { skill } = req.query;
    const { limit } = req.query;
    const users = await aiService.findBySkillMatch(skill, req.user.id, limit ? parseInt(limit) : 10);
    sendResponse(res, 200, users);
  } catch (err) {
    if (err.message === 'Skill is required') return next(new ApiError(400, err.message));
    next(err);
  }
};

module.exports = {
  getCollaboratorSuggestions,
  getInvestorSuggestions,
  getProjectRecommendations,
  getImprovementSuggestions,
  generateSummary,
  generatePitchDraft,
  generateDescription,
  findBySkillMatch,
};