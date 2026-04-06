const sendResponse = require('../utils/sendResponse');
const ApiError = require('../utils/ApiError');
const learningService = require('../services/LearningService');

/**
 * Convert project into a tutorial
 */
const createTutorial = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const { title, description, steps } = req.body;

    const tutorial = await learningService.createTutorial(
      parseInt(project_id),
      req.user.id,
      { title, description, steps }
    );

    sendResponse(res, 201, tutorial, 'Tutorial created successfully');
  } catch (err) {
    if (err.message === 'Project not found') {
      return next(new ApiError(404, err.message));
    }
    if (err.message === 'You do not own this project') {
      return next(new ApiError(403, err.message));
    }
    if (err.message === 'Tutorial already exists for this project') {
      return next(new ApiError(409, err.message));
    }
    next(err);
  }
};

/**
 * Get tutorial for a project
 */
const getTutorial = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const tutorial = await learningService.getTutorial(parseInt(project_id));
    sendResponse(res, 200, tutorial);
  } catch (err) {
    if (err.message === 'No tutorial found for this project') {
      return next(new ApiError(404, err.message));
    }
    next(err);
  }
};

/**
 * Get build replay
 */
const getBuildReplay = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const replay = await learningService.getBuildReplay(parseInt(project_id));
    sendResponse(res, 200, replay);
  } catch (err) {
    if (err.message === 'Project not found') {
      return next(new ApiError(404, err.message));
    }
    next(err);
  }
};

/**
 * Fork a project for practice
 */
const forkProject = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const { fork_name } = req.body;

    const result = await learningService.forkProject(
      parseInt(project_id),
      req.user.id,
      fork_name
    );

    sendResponse(res, 201, result, 'Project forked successfully');
  } catch (err) {
    if (err.message === 'Project not found') {
      return next(new ApiError(404, err.message));
    }
    if (err.message === 'You have already forked this project') {
      return next(new ApiError(409, err.message));
    }
    next(err);
  }
};

/**
 * Get user's forked projects
 */
const getUserForks = async (req, res, next) => {
  try {
    const forks = await learningService.getUserForks(req.user.id);
    sendResponse(res, 200, forks);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createTutorial,
  getTutorial,
  getBuildReplay,
  forkProject,
  getUserForks,
};