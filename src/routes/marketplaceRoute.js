const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

const {
  setProjectPricing,
  getProjectPricing,
  updateProjectPricing,
  browseListings,
  getListing,
  purchaseListing,
  getUserPurchases,
  getSellerSales,
} = require('../controllers/marketplaceController');


// Public routes

router.get('/listings', browseListings);
router.get('/listings/:listing_id', getListing);


// Protected routes

router.get('/purchases', protect, getUserPurchases);
router.get('/sales', protect, authorize('developer'), getSellerSales);
router.post('/listings/:listing_id/purchase', protect, purchaseListing);

// Project pricing (requires project ownership)
router.post('/projects/:project_id/pricing', protect, setProjectPricing);
router.get('/projects/:project_id/pricing', protect, getProjectPricing);
router.put('/projects/:project_id/pricing', protect, updateProjectPricing);

module.exports = router;