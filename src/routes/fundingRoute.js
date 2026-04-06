const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

const {
  createFundingRequest,
  getFundingDetails,
  updateFundingRequest,
  makeInvestment,
  sponsorProject,
  getBackers,
  getUserInvestments,
  getPortfolioSummary,
  getFundingOpportunities,
} = require('../controllers/fundingController');


// Public routes

router.get('/opportunities', getFundingOpportunities);
router.get('/projects/:project_id/funding', getFundingDetails);
router.get('/projects/:project_id/funding/backers', getBackers);


// Protected routes - Investor only

router.get('/investments', protect, authorize('investor'), getUserInvestments);
router.get('/investments/portfolio', protect, authorize('investor'), getPortfolioSummary);
router.post('/funding-requests/:funding_request_id/invest', protect, authorize('investor'), makeInvestment);
router.post('/projects/:project_id/sponsor', protect, sponsorProject);


// Protected routes - Owner only

router.post('/projects/:project_id/funding', protect, authorize('developer'), createFundingRequest);
router.put('/projects/:project_id/funding', protect, authorize('developer'), updateFundingRequest);

module.exports = router;