const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getBookings,
  getBookingById,
  createBooking,
  updateBookingStatus,
  deleteBooking,
  getProviderBookings,
  getCustomerBookings,
  acceptBooking,
  declineBooking,
  completeBooking,
  cancelBooking,
  getUrgentRequests
} = require('../controllers/bookingController');

// Public routes
// None for bookings

// Protected routes
router.use(protect);

// Customer routes
router.post('/', authorize('customer'), createBooking);
router.get('/customer/bookings', authorize('customer'), getCustomerBookings);

// Provider routes
router.get('/provider/bookings', authorize('provider'), getProviderBookings);
router.get('/provider/urgent', authorize('provider'), getUrgentRequests);
router.put('/:id/accept', authorize('provider'), acceptBooking);
router.put('/:id/decline', authorize('provider'), declineBooking);
router.put('/:id/complete', authorize('provider'), completeBooking);

// Shared routes
router.get('/:id', getBookingById);
router.put('/:id', updateBookingStatus);
router.delete('/:id', deleteBooking);
router.put('/:id/cancel', cancelBooking);

// Admin routes
router.get('/', authorize('admin'), getBookings);

module.exports = router;
