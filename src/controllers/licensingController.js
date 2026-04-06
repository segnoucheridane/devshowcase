const sendResponse = require('../utils/sendResponse');
const ApiError = require('../utils/ApiError');
const licensingService = require('../services/licensingService');

const requestVerification = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const result = await licensingService.requestVerification(parseInt(project_id), req.user.id);
    sendResponse(res, 201, result, 'Verification requested');
  } catch (err) {
    if (err.message === 'Project not found') return next(new ApiError(404, err.message));
    if (err.message === 'You do not own this project') return next(new ApiError(403, err.message));
    if (err.message === 'Verification already requested') return next(new ApiError(409, err.message));
    next(err);
  }
};

const getVerificationStatus = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const status = await licensingService.getVerificationStatus(parseInt(project_id));
    sendResponse(res, 200, status);
  } catch (err) {
    next(err);
  }
};

const addBlockchainProof = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const { blockchain_hash } = req.body;
    if (!blockchain_hash) return next(new ApiError(400, 'Blockchain hash is required'));
    
    const result = await licensingService.addBlockchainProof(parseInt(project_id), req.user.id, blockchain_hash);
    sendResponse(res, 200, result, 'Blockchain proof added');
  } catch (err) {
    if (err.message === 'Project not found') return next(new ApiError(404, err.message));
    if (err.message === 'You do not own this project') return next(new ApiError(403, err.message));
    next(err);
  }
};

const getLicenseTemplates = async (req, res, next) => {
  try {
    const templates = await licensingService.getLicenseTemplates();
    sendResponse(res, 200, templates);
  } catch (err) {
    next(err);
  }
};

const applyLicense = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const { license_id, custom_terms } = req.body;
    if (!license_id) return next(new ApiError(400, 'License ID is required'));
    
    const result = await licensingService.applyLicense(parseInt(project_id), req.user.id, parseInt(license_id), custom_terms);
    sendResponse(res, 200, result, 'License applied');
  } catch (err) {
    if (err.message === 'Project not found') return next(new ApiError(404, err.message));
    if (err.message === 'You do not own this project') return next(new ApiError(403, err.message));
    if (err.message === 'License template not found') return next(new ApiError(404, err.message));
    next(err);
  }
};

const getProjectLicense = async (req, res, next) => {
  try {
    const { project_id } = req.params;
    const license = await licensingService.getProjectLicense(parseInt(project_id));
    sendResponse(res, 200, license || { message: 'No license applied' });
  } catch (err) {
    next(err);
  }
};

const generatePurchaseLicense = async (req, res, next) => {
  try {
    const { listing_id } = req.params;
    const result = await licensingService.generatePurchaseLicense(parseInt(listing_id), req.user.id, req.body.buyer_id);
    sendResponse(res, 200, result);
  } catch (err) {
    if (err.message === 'Listing not found') return next(new ApiError(404, err.message));
    if (err.message === 'You do not own this listing') return next(new ApiError(403, err.message));
    next(err);
  }
};

const downloadLicense = async (req, res, next) => {
  try {
    const { license_id } = req.params;
    const result = await licensingService.downloadLicense(parseInt(license_id), req.user.id);
    
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename=license_${license_id}.txt`);
    res.send(result.content);
  } catch (err) {
    if (err.message === 'License not found') return next(new ApiError(404, err.message));
    if (err.message === 'You do not have access to this license') return next(new ApiError(403, err.message));
    next(err);
  }
};

module.exports = {
  requestVerification,
  getVerificationStatus,
  addBlockchainProof,
  getLicenseTemplates,
  applyLicense,
  getProjectLicense,
  generatePurchaseLicense,
  downloadLicense,
};