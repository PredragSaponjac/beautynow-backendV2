const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  addFavoriteProvider,
  removeFavoriteProvider,
  updateNotificationPreferences
} = require('../controllers/userController');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

// Protected routes
router.use(protect);
router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);
router.post('/favorites/:providerId', authorize('customer'), addFavoriteProvider);
router.delete('/favorites/:providerId', authorize('customer'), removeFavoriteProvider);
router.put('/notifications', updateNotificationPreferences);

module.exports = router;
