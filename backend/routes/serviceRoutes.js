const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createService,
  getServices,
  getServiceById,
  updateService,
  deleteService,
  getProviderServices
} = require('../controllers/serviceController');

// Public routes
router.get('/', getServices);
router.get('/:id', getServiceById);

// Protected routes
router.use(protect);
router.post('/', authorize('provider'), createService);
router.get('/provider/services', authorize('provider'), getProviderServices);
router.route('/:id')
  .put(authorize('provider'), updateService)
  .delete(authorize('provider'), deleteService);

module.exports = router;
