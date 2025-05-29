const Booking = require('../models/Booking');
const Provider = require('../models/Provider');
const Service = require('../models/Service');
const User = require('../models/User');

// @desc    Get all bookings
// @route   GET /api/bookings
// @access  Private/Admin
exports.getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('customer', 'name email')
      .populate('provider', 'businessName')
      .populate('service', 'name price');

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get booking by ID
// @route   GET /api/bookings/:id
// @access  Private
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('provider', 'businessName address contactInfo')
      .populate('service', 'name description duration price');

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Check if user is authorized to view this booking
    if (
      booking.customer._id.toString() !== req.user._id.toString() &&
      booking.provider.user.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this booking'
      });
    }

    res.status(200).json({
      success: true,
      booking
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Create a new booking
// @route   POST /api/bookings
// @access  Private/Customer
exports.createBooking = async (req, res) => {
  try {
    const {
      providerId,
      serviceId,
      date,
      customerLocation,
      notes,
      isUrgent,
      requestedTime
    } = req.body;

    // Check if provider exists
    const provider = await Provider.findById(providerId);
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found'
      });
    }

    // Check if service exists and belongs to provider
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }

    if (service.provider.toString() !== providerId) {
      return res.status(400).json({
        success: false,
        error: 'Service does not belong to this provider'
      });
    }

    // Calculate distance if coordinates are provided
    let distanceToCustomer = 0;
    if (
      customerLocation &&
      customerLocation.coordinates &&
      provider.location &&
      provider.location.coordinates
    ) {
      // Simple distance calculation (could be replaced with more accurate calculation)
      const providerCoords = provider.location.coordinates;
      const customerCoords = customerLocation.coordinates;
      
      // Calculate distance in miles using Haversine formula
      const R = 3958.8; // Earth's radius in miles
      const dLat = (customerCoords[1] - providerCoords[1]) * Math.PI / 180;
      const dLon = (customerCoords[0] - providerCoords[0]) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(providerCoords[1] * Math.PI / 180) * Math.cos(customerCoords[1] * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      distanceToCustomer = R * c;
    }

    // Create booking
    const booking = await Booking.create({
      customer: req.user._id,
      provider: providerId,
      service: serviceId,
      serviceDetails: {
        name: service.name,
        category: service.category,
        duration: service.duration,
        price: service.price
      },
      date: date || new Date(),
      status: 'pending',
      isUrgent: isUrgent || false,
      requestedTime: requestedTime || 'ASAP',
      customerLocation,
      providerLocation: {
        coordinates: provider.location.coordinates
      },
      distanceToCustomer,
      notes,
      totalPrice: service.price
    });

    // Add initial timeline entry
    booking.timeline.push({
      status: 'requested',
      timestamp: new Date(),
      note: 'Service requested'
    });

    await booking.save();

    // Send notification to provider if they have notifications enabled
    if (provider.notificationPreferences.sms.enabled && 
        provider.notificationPreferences.sms.newRequests) {
      // SMS notification logic would go here
      console.log(`SMS notification sent to provider ${provider.businessName}`);
    }

    if (provider.notificationPreferences.email.enabled && 
        provider.notificationPreferences.email.newRequests) {
      // Email notification logic would go here
      console.log(`Email notification sent to provider ${provider.businessName}`);
    }

    res.status(201).json({
      success: true,
      booking
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update booking status
// @route   PUT /api/bookings/:id
// @access  Private
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Check if user is authorized to update this booking
    const provider = await Provider.findById(booking.provider);
    
    if (
      (req.user.role === 'provider' && provider.user.toString() !== req.user._id.toString()) &&
      (req.user.role === 'customer' && booking.customer.toString() !== req.user._id.toString()) &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this booking'
      });
    }

    // Update booking status
    booking.status = status;

    // Add timeline entry
    booking.timeline.push({
      status,
      timestamp: new Date(),
      note: `Status changed to ${status}`
    });

    const updatedBooking = await booking.save();

    // Send notification to customer
    const customer = await User.findById(booking.customer);
    
    if (customer.preferences && 
        customer.preferences.notificationPreferences && 
        customer.preferences.notificationPreferences.sms.enabled) {
      // SMS notification logic would go here
      console.log(`SMS notification sent to customer ${customer.name}`);
    }

    res.status(200).json({
      success: true,
      booking: updatedBooking
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete booking
// @route   DELETE /api/bookings/:id
// @access  Private
exports.deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Check if user is authorized to delete this booking
    if (
      booking.customer.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this booking'
      });
    }

    // Only allow deletion if booking is pending or cancelled
    if (!['pending', 'cancelled'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete booking that is not pending or cancelled'
      });
    }

    await booking.remove();

    res.status(200).json({
      success: true,
      message: 'Booking deleted'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get provider bookings
// @route   GET /api/bookings/provider/bookings
// @access  Private/Provider
exports.getProviderBookings = async (req, res) => {
  try {
    // Find provider associated with user
    const provider = await Provider.findOne({ user: req.user._id });

    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found'
      });
    }

    // Build query
    let query = { provider: provider._id };
    
    // Filter by status if provided
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    // Filter by date range if provided
    if (req.query.startDate && req.query.endDate) {
      query.date = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    const bookings = await Booking.find(query)
      .populate('customer', 'name email phone')
      .populate('service', 'name price duration')
      .sort({ date: -1 })
      .skip(startIndex)
      .limit(limit);
    
    const total = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      count: bookings.length,
      total,
      pages: Math.ceil(total / limit),
      page,
      bookings
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get customer bookings
// @route   GET /api/bookings/customer/bookings
// @access  Private/Customer
exports.getCustomerBookings = async (req, res) => {
  try {
    // Build query
    let query = { customer: req.user._id };
    
    // Filter by status if provided
    if (req.query.status) {
      query.status = req.query.status;
    }
    
    // Filter by date range if provided
    if (req.query.startDate && req.query.endDate) {
      query.date = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    const bookings = await Booking.find(query)
      .populate('provider', 'businessName')
      .populate('service', 'name price duration')
      .sort({ date: -1 })
      .skip(startIndex)
      .limit(limit);
    
    const total = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      count: bookings.length,
      total,
      pages: Math.ceil(total / limit),
      page,
      bookings
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Accept booking
// @route   PUT /api/bookings/:id/accept
// @access  Private/Provider
exports.acceptBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Find provider associated with user
    const provider = await Provider.findOne({ user: req.user._id });

    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found'
      });
    }

    // Check if this booking belongs to the provider
    if (booking.provider.toString() !== provider._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to accept this booking'
      });
    }

    // Check if booking is in pending status
    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Booking cannot be accepted because it is ${booking.status}`
      });
    }

    // Update booking status
    booking.status = 'accepted';

    // Add timeline entry
    booking.timeline.push({
      status: 'accepted',
      timestamp: new Date(),
      note: 'Request accepted by provider'
    });

    const updatedBooking = await booking.save();

    // Send notification to customer
    const customer = await User.findById(booking.customer);
    
    if (customer.preferences && 
        customer.preferences.notificationPreferences && 
        customer.preferences.notificationPreferences.sms.enabled) {
      // SMS notification logic would go here
      console.log(`SMS notification sent to customer ${customer.name}`);
    }

    res.status(200).json({
      success: true,
      booking: updatedBooking
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Decline booking
// @route   PUT /api/bookings/:id/decline
// @access  Private/Provider
exports.declineBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Find provider associated with user
    const provider = await Provider.findOne({ user: req.user._id });

    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found'
      });
    }

    // Check if this booking belongs to the provider
    if (booking.provider.toString() !== provider._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to decline this booking'
      });
    }

    // Check if booking is in pending status
    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Booking cannot be declined because it is ${booking.status}`
      });
    }

    // Update booking status
    booking.status = 'declined';

    // Add timeline entry
    booking.timeline.push({
      status: 'declined',
      timestamp: new Date(),
      note: 'Request declined by provider'
    });

    const updatedBooking = await booking.save();

    // Send notification to customer
    const customer = await User.findById(booking.customer);
    
    if (customer.preferences && 
        customer.preferences.notificationPreferences && 
        customer.preferences.notificationPreferences.sms.enabled) {
      // SMS notification logic would go here
      console.log(`SMS notification sent to customer ${customer.name}`);
    }

    res.status(200).json({
      success: true,
      booking: updatedBooking
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Complete booking
// @route   PUT /api/bookings/:id/complete
// @access  Private/Provider
exports.completeBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Find provider associated with user
    const provider = await Provider.findOne({ user: req.user._id });

    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found'
      });
    }

    // Check if this booking belongs to the provider
    if (booking.provider.toString() !== provider._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to complete this booking'
      });
    }

    // Check if booking is in accepted status
    if (booking.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        error: `Booking cannot be completed because it is ${booking.status}`
      });
    }

    // Update booking status
    booking.status = 'completed';

    // Add timeline entry
    booking.timeline.push({
      status: 'completed',
      timestamp: new Date(),
      note: 'Service completed by provider'
    });

    const updatedBooking = await booking.save();

    // Update provider stats
    provider.stats.completedServices += 1;
    provider.stats.totalEarnings += booking.totalPrice;
    await provider.save();

    // Send notification to customer
    const customer = await User.findById(booking.customer);
    
    if (customer.preferences && 
        customer.preferences.notificationPreferences && 
        customer.preferences.notificationPreferences.sms.enabled) {
      // SMS notification logic would go here
      console.log(`SMS notification sent to customer ${customer.name}`);
    }

    res.status(200).json({
      success: true,
      booking: updatedBooking
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        error: 'Booking not found'
      });
    }

    // Check if user is authorized to cancel this booking
    const provider = await Provider.findById(booking.provider);
    
    if (
      (req.user.role === 'provider' && provider.user.toString() !== req.user._id.toString()) &&
      (req.user.role === 'customer' && booking.customer.toString() !== req.user._id.toString()) &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to cancel this booking'
      });
    }

    // Check if booking can be cancelled
    if (!['pending', 'accepted'].includes(booking.status)) {
      return res.status(400).json({
        success: false,
        error: `Booking cannot be cancelled because it is ${booking.status}`
      });
    }

    // Update booking status
    booking.status = 'cancelled';

    // Add timeline entry
    booking.timeline.push({
      status: 'cancelled',
      timestamp: new Date(),
      note: `Booking cancelled by ${req.user.role}`
    });

    const updatedBooking = await booking.save();

    // Send notification to other party
    if (req.user.role === 'provider') {
      const customer = await User.findById(booking.customer);
      
      if (customer.preferences && 
          customer.preferences.notificationPreferences && 
          customer.preferences.notificationPreferences.sms.enabled) {
        // SMS notification logic would go here
        console.log(`SMS notification sent to customer ${customer.name}`);
      }
    } else if (req.user.role === 'customer') {
      if (provider.notificationPreferences.sms.enabled && 
          provider.notificationPreferences.sms.clientCancellations) {
        // SMS notification logic would go here
        console.log(`SMS notification sent to provider ${provider.businessName}`);
      }
    }

    res.status(200).json({
      success: true,
      booking: updatedBooking
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get urgent requests
// @route   GET /api/bookings/provider/urgent
// @access  Private/Provider
exports.getUrgentRequests = async (req, res) => {
  try {
    // Find provider associated with user
    const provider = await Provider.findOne({ user: req.user._id });

    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found'
      });
    }

    // Find services offered by this provider
    const services = await Service.find({ provider: provider._id });
    const serviceIds = services.map(service => service._id);

    // Find urgent bookings for this provider's services
    const urgentBookings = await Booking.find({
      provider: provider._id,
      service: { $in: serviceIds },
      status: 'pending',
      isUrgent: true
    })
      .populate('customer', 'name email phone')
      .populate('service', 'name price duration')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: urgentBookings.length,
      bookings: urgentBookings
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};
