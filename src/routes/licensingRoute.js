const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

const {
  requestVerification,
  getVerificationStatus,
  addBlockchainProof,
  getLicenseTemplates,
  applyLicense,
  getProjectLicense,
  generatePurchaseLicense,
  downloadLicense,
} = require('../controllers/licensingController');

// Public routes
router.get('/projects/:project_id/ownership/status', getVerificationStatus);
router.get('/projects/:project_id/license/templates', getLicenseTemplates);
router.get('/projects/:project_id/license', getProjectLicense);

// Protected routes
router.post('/projects/:project_id/ownership/verify', protect, authorize('developer'), requestVerification);
router.post('/projects/:project_id/ownership/blockchain', protect, authorize('developer'), addBlockchainProof);
router.post('/projects/:project_id/license/apply', protect, authorize('developer'), applyLicense);
router.post('/marketplace/listings/:listing_id/license', protect, authorize('developer'), generatePurchaseLicense);
router.get('/marketplace/licenses/:license_id', protect, downloadLicense);

module.exports = router;