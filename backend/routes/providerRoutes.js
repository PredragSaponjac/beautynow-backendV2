const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createProvider,
  getProviderProfile,
  updateProviderProfile,
  updateNotificationPreferences,
  getSubscriptionStatus,
  getProviders,
  getProviderById,
  addProviderReview,
  getProviderStats
} = require('../controllers/providerController');

// Public routes
router.get('/', getProviders);
router.get('/:id', getProviderById);

// Protected routes
router.post('/', protect, authorize('customer'), createProvider);
router.get('/profile', protect, authorize('provider'), getProviderProfile);
router.put('/profile', protect, authorize('provider'), updateProviderProfile);
router.put('/notifications', protect, authorize('provider'), updateNotificationPreferences);
router.get('/subscription', protect, authorize('provider'), getSubscriptionStatus);
router.get('/stats', protect, authorize('provider'), getProviderStats);
router.post('/:id/reviews', protect, authorize('customer'), addProviderReview);

module.exports = router;
