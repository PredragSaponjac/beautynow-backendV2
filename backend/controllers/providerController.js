const Provider = require('../models/Provider');
const User = require('../models/User');
const Service = require('../models/Service');
const axios = require('axios');

// @desc    Create a new provider profile
// @route   POST /api/providers
// @access  Private
exports.createProvider = async (req, res) => {
  try {
    // Check if provider already exists for this user
    const existingProvider = await Provider.findOne({ user: req.user._id });
    if (existingProvider) {
      return res.status(400).json({
        success: false,
        error: 'Provider profile already exists for this user'
      });
    }

    // Get coordinates from address using Google Maps Geocoding API
    let coordinates = [];
    if (req.body.address) {
      const address = `${req.body.address.street}, ${req.body.address.city}, ${req.body.address.state} ${req.body.address.zipCode}`;
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.MAPS_API_KEY}`;
      
      const response = await axios.get(geocodeUrl);
      
      if (response.data.results && response.data.results.length > 0) {
        const location = response.data.results[0].geometry.location;
        coordinates = [location.lng, location.lat];
      }
    }

    // Initialize notification preferences
    const notificationPreferences = {
      sms: {
        enabled: true,
        phoneNumber: req.body.contactInfo?.phone || '',
        newRequests: true,
        requestReminders: true,
        appointmentReminders: true,
        clientCancellations: true,
        newReviews: false,
        paymentNotifications: false,
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00'
        }
      },
      email: {
        enabled: true,
        address: req.body.contactInfo?.email || req.user.email,
        newRequests: true,
        dailySummary: true,
        weeklyReport: true,
        marketingUpdates: false
      }
    };

    // Initialize service categories based on provided data
    const serviceCategories = req.body.serviceCategories || {
      beautyServices: {},
      wellnessAndMassage: {},
      mentalHealthAndConsulting: {},
      fitnessAndPersonalTraining: {},
      alternativeHealth: {},
      adultOnlyMassage: {}
    };

    // Check if provider offers adult-only services
    const isAdultServiceProvider = 
      serviceCategories.adultOnlyMassage && 
      Object.values(serviceCategories.adultOnlyMassage).some(value => value === true);

    // Create provider profile
    const provider = await Provider.create({
      user: req.user._id,
      businessName: req.body.businessName,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      description: req.body.description,
      address: req.body.address,
      contactInfo: req.body.contactInfo,
      location: {
        type: 'Point',
        coordinates: coordinates
      },
      serviceCategories: serviceCategories,
      notificationPreferences: notificationPreferences,
      isAdultServiceProvider: isAdultServiceProvider,
      availability: req.body.availability || {
        monday: { start: '09:00', end: '17:00', isAvailable: true },
        tuesday: { start: '09:00', end: '17:00', isAvailable: true },
        wednesday: { start: '09:00', end: '17:00', isAvailable: true },
        thursday: { start: '09:00', end: '17:00', isAvailable: true },
        friday: { start: '09:00', end: '17:00', isAvailable: true },
        saturday: { start: '10:00', end: '15:00', isAvailable: true },
        sunday: { start: '00:00', end: '00:00', isAvailable: false }
      },
      subscription: {
        status: 'trial',
        trialStartDate: new Date(),
        plan: 'monthly'
      }
    });

    // Update user role to provider
    await User.findByIdAndUpdate(req.user._id, { role: 'provider' });

    res.status(201).json({
      success: true,
      provider
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get provider profile
// @route   GET /api/providers/profile
// @access  Private
exports.getProviderProfile = async (req, res) => {
  try {
    const provider = await Provider.findOne({ user: req.user._id })
      .populate('services');
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider profile not found'
      });
    }
    
    res.status(200).json({
      success: true,
      provider
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update provider profile
// @route   PUT /api/providers/profile
// @access  Private
exports.updateProviderProfile = async (req, res) => {
  try {
    const provider = await Provider.findOne({ user: req.user._id });
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider profile not found'
      });
    }
    
    // Get coordinates from address if address is updated
    let coordinates = provider.location.coordinates;
    if (req.body.address) {
      const address = `${req.body.address.street}, ${req.body.address.city}, ${req.body.address.state} ${req.body.address.zipCode}`;
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.MAPS_API_KEY}`;
      
      const response = await axios.get(geocodeUrl);
      
      if (response.data.results && response.data.results.length > 0) {
        const location = response.data.results[0].geometry.location;
        coordinates = [location.lng, location.lat];
      }
    }
    
    // Check if provider offers adult-only services
    let isAdultServiceProvider = provider.isAdultServiceProvider;
    if (req.body.serviceCategories && req.body.serviceCategories.adultOnlyMassage) {
      isAdultServiceProvider = Object.values(req.body.serviceCategories.adultOnlyMassage).some(value => value === true);
    }
    
    // Update provider fields
    provider.businessName = req.body.businessName || provider.businessName;
    provider.firstName = req.body.firstName || provider.firstName;
    provider.lastName = req.body.lastName || provider.lastName;
    provider.description = req.body.description || provider.description;
    
    if (req.body.contactInfo) {
      provider.contactInfo = {
        ...provider.contactInfo,
        ...req.body.contactInfo
      };
    }
    
    if (req.body.address) {
      provider.address = req.body.address;
      provider.location.coordinates = coordinates;
    }
    
    if (req.body.serviceCategories) {
      // Merge existing service categories with new ones
      for (const category in req.body.serviceCategories) {
        provider.serviceCategories[category] = {
          ...provider.serviceCategories[category],
          ...req.body.serviceCategories[category]
        };
      }
      provider.isAdultServiceProvider = isAdultServiceProvider;
    }
    
    if (req.body.availability) {
      provider.availability = req.body.availability;
    }
    
    const updatedProvider = await provider.save();
    
    res.status(200).json({
      success: true,
      provider: updatedProvider
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update notification preferences
// @route   PUT /api/providers/notifications
// @access  Private
exports.updateNotificationPreferences = async (req, res) => {
  try {
    const provider = await Provider.findOne({ user: req.user._id });
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider profile not found'
      });
    }
    
    // Update SMS notification preferences
    if (req.body.sms) {
      provider.notificationPreferences.sms = {
        ...provider.notificationPreferences.sms,
        ...req.body.sms
      };
    }
    
    // Update email notification preferences
    if (req.body.email) {
      provider.notificationPreferences.email = {
        ...provider.notificationPreferences.email,
        ...req.body.email
      };
    }
    
    const updatedProvider = await provider.save();
    
    res.status(200).json({
      success: true,
      notificationPreferences: updatedProvider.notificationPreferences
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get subscription status
// @route   GET /api/providers/subscription
// @access  Private
exports.getSubscriptionStatus = async (req, res) => {
  try {
    const provider = await Provider.findOne({ user: req.user._id });
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider profile not found'
      });
    }
    
    // Calculate days remaining in trial
    let daysRemaining = 0;
    if (provider.subscription.status === 'trial') {
      const trialEnd = new Date(provider.subscription.trialEndDate);
      const today = new Date();
      daysRemaining = Math.ceil((trialEnd - today) / (1000 * 60 * 60 * 24));
    }
    
    res.status(200).json({
      success: true,
      subscription: {
        ...provider.subscription.toObject(),
        daysRemaining: daysRemaining
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get all providers
// @route   GET /api/providers
// @access  Public
exports.getProviders = async (req, res) => {
  try {
    // Build query
    let query = {};
    
    // Filter by service category
    if (req.query.category) {
      // Find providers that offer this service category
      const categoryGroup = req.query.categoryGroup || 'beautyServices';
      const categoryField = `serviceCategories.${categoryGroup}.${req.query.category}`;
      
      query[categoryField] = true;
    }
    
    // Filter by adult-only services
    if (req.query.adultOnly === 'true') {
      query.isAdultServiceProvider = true;
    } else if (req.query.adultOnly === 'false') {
      query.isAdultServiceProvider = false;
    }
    
    // Search by location
    if (req.query.lat && req.query.lng && req.query.distance) {
      const lat = parseFloat(req.query.lat);
      const lng = parseFloat(req.query.lng);
      const distance = parseInt(req.query.distance);
      
      // Find providers within distance (km)
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lng, lat]
          },
          $maxDistance: distance * 1000 // convert to meters
        }
      };
    }
    
    // Filter by availability
    if (req.query.day) {
      const day = req.query.day.toLowerCase();
      if (['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].includes(day)) {
        query[`availability.${day}.isAvailable`] = true;
      }
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    const providers = await Provider.find(query)
      .populate('services')
      .skip(startIndex)
      .limit(limit);
    
    const total = await Provider.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: providers.length,
      total,
      pages: Math.ceil(total / limit),
      page,
      providers
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get provider by ID
// @route   GET /api/providers/:id
// @access  Public
exports.getProviderById = async (req, res) => {
  try {
    const provider = await Provider.findById(req.params.id)
      .populate('services')
      .populate({
        path: 'reviews.user',
        select: 'name'
      });
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found'
      });
    }
    
    res.status(200).json({
      success: true,
      provider
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Add review to provider
// @route   POST /api/providers/:id/reviews
// @access  Private
exports.addProviderReview = async (req, res) => {
  try {
    const { rating, text } = req.body;
    
    const provider = await Provider.findById(req.params.id);
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found'
      });
    }
    
    // Check if user already reviewed this provider
    const alreadyReviewed = provider.reviews.find(
      review => review.user.toString() === req.user._id.toString()
    );
    
    if (alreadyReviewed) {
      return res.status(400).json({
        success: false,
        error: 'Provider already reviewed'
      });
    }
    
    // Add review
    const review = {
      user: req.user._id,
      text,
      rating: Number(rating)
    };
    
    provider.reviews.push(review);
    
    // Update provider rating
    provider.rating = provider.reviews.reduce((acc, item) => item.rating + acc, 0) / provider.reviews.length;
    
    await provider.save();
    
    // Send notification if enabled
    if (provider.notificationPreferences.sms.newReviews) {
      // SMS notification logic would go here
    }
    
    if (provider.notificationPreferences.email.newReviews) {
      // Email notification logic would go here
    }
    
    res.status(201).json({
      success: true,
      message: 'Review added'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get provider statistics
// @route   GET /api/providers/stats
// @access  Private
exports.getProviderStats = async (req, res) => {
  try {
    const provider = await Provider.findOne({ user: req.user._id });
    
    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider profile not found'
      });
    }
    
    // Get bookings count
    const bookingsCount = await Booking.countDocuments({ 
      provider: provider._id,
      status: 'completed'
    });
    
    // Get pending requests count
    const pendingRequestsCount = await Booking.countDocuments({
      provider: provider._id,
      status: 'pending'
    });
    
    // Calculate earnings (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentBookings = await Booking.find({
      provider: provider._id,
      status: 'completed',
      date: { $gte: thirtyDaysAgo }
    });
    
    const monthlyEarnings = recentBookings.reduce((total, booking) => total + booking.totalPrice, 0);
    
    res.status(200).json({
      success: true,
      stats: {
        completedServices: bookingsCount,
        pendingRequests: pendingRequestsCount,
        monthlyEarnings: monthlyEarnings,
        rating: provider.rating
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};
