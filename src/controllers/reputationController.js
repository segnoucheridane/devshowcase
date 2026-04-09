const sendResponse = require('../utils/sendResponse');
const ApiError = require('../utils/ApiError');
const reputationService = require('../services/ReputationService');

/**
 * Get user's reputation score breakdown
 */
const getReputationScore = async (req, res, next) => {
  try {
    const { user_id } = req.params;
    const reputation = await reputationService.getReputationScore(parseInt(user_id));
    sendResponse(res, 200, reputation);
  } catch (err) {
    if (err.message === 'User not found') {
      return next(new ApiError(404, err.message));
    }
    next(err);
  }
};

/**
 * Endorse a user for a skill
 */
const endorseUser = async (req, res, next) => {
  try {
    const { user_id } = req.params;
    const { skill, message } = req.body;

    if (!skill) {
      return next(new ApiError(400, 'Skill is required'));
    }

    const endorsement = await reputationService.endorseUser(
      req.user.id,
      parseInt(user_id),
      skill,
      message
    );

    sendResponse(res, 201, endorsement, 'Endorsement added successfully');
  } catch (err) {
    if (err.message === 'You cannot endorse yourself') {
      return next(new ApiError(403, err.message));
    }
    if (err.message === 'User not found') {
      return next(new ApiError(404, err.message));
    }
    if (err.message === 'You have already endorsed this user for this skill') {
      return next(new ApiError(409, err.message));
    }
    next(err);
  }
};

/**
 * Get all endorsements for a user
 */
const getUserEndorsements = async (req, res, next) => {
  try {
    const { user_id } = req.params;
    const endorsements = await reputationService.getUserEndorsements(parseInt(user_id));
    sendResponse(res, 200, endorsements);
  } catch (err) {
    next(err);
  }
};

/**
 * Remove an endorsement
 */
const removeEndorsement = async (req, res, next) => {
  try {
    const { user_id, skill } = req.params;
    const result = await reputationService.removeEndorsement(
      parseInt(user_id),
      skill,
      req.user.id
    );
    sendResponse(res, 200, result, 'Endorsement removed');
  } catch (err) {
    if (err.message === 'Endorsement not found') {
      return next(new ApiError(404, err.message));
    }
    next(err);
  }
};

/**
 * Get build verification status
 */
const getBuildVerification = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const verification = await reputationService.getBuildVerification(parseInt(project_id));
    sendResponse(res, 200, verification);
  } catch (err) {
    if (err.message === 'Project not found') {
      return next(new ApiError(404, err.message));
    }
    next(err);
  }
};

/**
 * Request build verification
 */
const requestBuildVerification = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const result = await reputationService.requestBuildVerification(
      parseInt(project_id),
      req.user.id
    );
    sendResponse(res, 200, result, 'Verification request submitted');
  } catch (err) {
    if (err.message === 'Project not found') {
      return next(new ApiError(404, err.message));
    }
    if (err.message === 'You do not own this project') {
      return next(new ApiError(403, err.message));
    }
    next(err);
  }
};

/**
 * Get user's activity history
 */
const getActivityHistory = async (req, res, next) => {
  try {
    const { user_id } = req.params;
    const { page, limit } = req.query;
    const result = await reputationService.getActivityHistory(parseInt(user_id), { page, limit });
    sendResponse(res, 200, result.activities, null, {
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getReputationScore,
  endorseUser,
  getUserEndorsements,
  removeEndorsement,
  getBuildVerification,
  requestBuildVerification,
  getActivityHistory,
};