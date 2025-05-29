const Service = require('../models/Service');
const Provider = require('../models/Provider');

// @desc    Create a new service
// @route   POST /api/services
// @access  Private/Provider
exports.createService = async (req, res) => {
  try {
    // Find provider associated with user
    const provider = await Provider.findOne({ user: req.user._id });

    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found'
      });
    }

    // Determine category group based on category
    let categoryGroup = 'other';
    
    const beautyServices = ['hairStyling', 'haircuts', 'hairColoring', 'hairExtensions', 
      'manicure', 'pedicure', 'facial', 'makeup', 'waxing', 'lashExtensions', 
      'eyebrowStyling', 'sprayTanning', 'hair', 'nails', 'skincare', 'makeup'];
      
    const wellnessServices = ['swedishMassage', 'deepTissue', 'hotStone', 'sportsMassage',
      'prenatalMassage', 'reflexology', 'acupuncture', 'cuppingTherapy',
      'reiki', 'privateYoga', 'massage'];
      
    const mentalHealthServices = ['therapySessions', 'counseling', 'psychologyConsultation',
      'lifeCoaching', 'careerCounseling', 'relationshipCounseling',
      'guidedMeditation', 'stressManagement'];
      
    const fitnessServices = ['personalTraining', 'pilates', 'nutritionConsulting',
      'fitnessAssessment', 'assistedStretching'];
      
    const alternativeHealthServices = ['naturopathy', 'homeopathy', 'ayurvedicConsultation',
      'herbalistConsultation', 'energyHealing'];
      
    const adultOnlyServices = ['sensualMassage', 'tantricMassage', 'fullBodyMassage',
      'nuruMassage', 'fourHandsMassage', 'couplesMassage'];
    
    if (beautyServices.includes(req.body.category)) {
      categoryGroup = 'beautyServices';
    } else if (wellnessServices.includes(req.body.category)) {
      categoryGroup = 'wellnessAndMassage';
    } else if (mentalHealthServices.includes(req.body.category)) {
      categoryGroup = 'mentalHealthAndConsulting';
    } else if (fitnessServices.includes(req.body.category)) {
      categoryGroup = 'fitnessAndPersonalTraining';
    } else if (alternativeHealthServices.includes(req.body.category)) {
      categoryGroup = 'alternativeHealth';
    } else if (adultOnlyServices.includes(req.body.category)) {
      categoryGroup = 'adultOnlyMassage';
    }
    
    // Check if service is adult-only
    const isAdultOnly = adultOnlyServices.includes(req.body.category);

    // Create service
    const service = await Service.create({
      provider: provider._id,
      name: req.body.name,
      description: req.body.description,
      duration: req.body.duration,
      price: req.body.price,
      category: req.body.category,
      categoryGroup,
      isAdultOnly,
      requiresAgeVerification: isAdultOnly,
      priceRange: {
        min: req.body.price,
        max: req.body.price * 1.5 // Default max price is 1.5x the base price
      },
      acceptsUrgentRequests: req.body.acceptsUrgentRequests !== false, // Default to true
      maxTravelDistance: req.body.maxTravelDistance || 10, // Default to 10 miles
      availability: req.body.availability || {
        monday: { available: true, slots: [{ start: '09:00', end: '17:00' }] },
        tuesday: { available: true, slots: [{ start: '09:00', end: '17:00' }] },
        wednesday: { available: true, slots: [{ start: '09:00', end: '17:00' }] },
        thursday: { available: true, slots: [{ start: '09:00', end: '17:00' }] },
        friday: { available: true, slots: [{ start: '09:00', end: '17:00' }] },
        saturday: { available: true, slots: [{ start: '10:00', end: '15:00' }] },
        sunday: { available: false, slots: [] }
      }
    });

    // Add service to provider's services array
    provider.services.push(service._id);
    await provider.save();

    res.status(201).json({
      success: true,
      service
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get all services
// @route   GET /api/services
// @access  Public
exports.getServices = async (req, res) => {
  try {
    // Build query
    let query = {};
    
    // Filter by category
    if (req.query.category) {
      query.category = req.query.category;
    }
    
    // Filter by category group
    if (req.query.categoryGroup) {
      query.categoryGroup = req.query.categoryGroup;
    }
    
    // Filter by price range
    if (req.query.minPrice && req.query.maxPrice) {
      query.price = {
        $gte: parseFloat(req.query.minPrice),
        $lte: parseFloat(req.query.maxPrice)
      };
    } else if (req.query.minPrice) {
      query.price = { $gte: parseFloat(req.query.minPrice) };
    } else if (req.query.maxPrice) {
      query.price = { $lte: parseFloat(req.query.maxPrice) };
    }
    
    // Filter by duration
    if (req.query.minDuration && req.query.maxDuration) {
      query.duration = {
        $gte: parseInt(req.query.minDuration),
        $lte: parseInt(req.query.maxDuration)
      };
    }
    
    // Filter by adult-only content
    if (req.query.adultOnly === 'true') {
      query.isAdultOnly = true;
    } else if (req.query.adultOnly === 'false') {
      query.isAdultOnly = false;
    }
    
    // Filter by active status
    if (req.query.isActive) {
      query.isActive = req.query.isActive === 'true';
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    const services = await Service.find(query)
      .populate('provider', 'businessName rating')
      .skip(startIndex)
      .limit(limit);
    
    const total = await Service.countDocuments(query);

    res.status(200).json({
      success: true,
      count: services.length,
      total,
      pages: Math.ceil(total / limit),
      page,
      services
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get service by ID
// @route   GET /api/services/:id
// @access  Public
exports.getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id)
      .populate('provider', 'businessName description address contactInfo rating');

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
      });
    }

    res.status(200).json({
      success: true,
      service
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update service
// @route   PUT /api/services/:id
// @access  Private/Provider
exports.updateService = async (req, res) => {
  try {
    let service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
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

    // Check if service belongs to provider
    if (service.provider.toString() !== provider._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this service'
      });
    }

    // Update category group if category is updated
    let categoryGroup = service.categoryGroup;
    
    if (req.body.category) {
      const beautyServices = ['hairStyling', 'haircuts', 'hairColoring', 'hairExtensions', 
        'manicure', 'pedicure', 'facial', 'makeup', 'waxing', 'lashExtensions', 
        'eyebrowStyling', 'sprayTanning', 'hair', 'nails', 'skincare', 'makeup'];
        
      const wellnessServices = ['swedishMassage', 'deepTissue', 'hotStone', 'sportsMassage',
        'prenatalMassage', 'reflexology', 'acupuncture', 'cuppingTherapy',
        'reiki', 'privateYoga', 'massage'];
        
      const mentalHealthServices = ['therapySessions', 'counseling', 'psychologyConsultation',
        'lifeCoaching', 'careerCounseling', 'relationshipCounseling',
        'guidedMeditation', 'stressManagement'];
        
      const fitnessServices = ['personalTraining', 'pilates', 'nutritionConsulting',
        'fitnessAssessment', 'assistedStretching'];
        
      const alternativeHealthServices = ['naturopathy', 'homeopathy', 'ayurvedicConsultation',
        'herbalistConsultation', 'energyHealing'];
        
      const adultOnlyServices = ['sensualMassage', 'tantricMassage', 'fullBodyMassage',
        'nuruMassage', 'fourHandsMassage', 'couplesMassage'];
      
      if (beautyServices.includes(req.body.category)) {
        categoryGroup = 'beautyServices';
      } else if (wellnessServices.includes(req.body.category)) {
        categoryGroup = 'wellnessAndMassage';
      } else if (mentalHealthServices.includes(req.body.category)) {
        categoryGroup = 'mentalHealthAndConsulting';
      } else if (fitnessServices.includes(req.body.category)) {
        categoryGroup = 'fitnessAndPersonalTraining';
      } else if (alternativeHealthServices.includes(req.body.category)) {
        categoryGroup = 'alternativeHealth';
      } else if (adultOnlyServices.includes(req.body.category)) {
        categoryGroup = 'adultOnlyMassage';
      } else {
        categoryGroup = 'other';
      }
      
      // Check if service is adult-only
      const isAdultOnly = adultOnlyServices.includes(req.body.category);
      req.body.isAdultOnly = isAdultOnly;
      req.body.requiresAgeVerification = isAdultOnly;
    }
    
    // Update price range if price is updated
    if (req.body.price) {
      req.body.priceRange = {
        min: req.body.price,
        max: req.body.price * 1.5 // Default max price is 1.5x the base price
      };
    }

    // Update service
    service = await Service.findByIdAndUpdate(
      req.params.id,
      { ...req.body, categoryGroup },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      service
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete service
// @route   DELETE /api/services/:id
// @access  Private/Provider
exports.deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        error: 'Service not found'
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

    // Check if service belongs to provider
    if (service.provider.toString() !== provider._id.toString()) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this service'
      });
    }

    // Remove service from provider's services array
    provider.services = provider.services.filter(
      id => id.toString() !== service._id.toString()
    );
    await provider.save();

    await service.remove();

    res.status(200).json({
      success: true,
      message: 'Service deleted'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get provider services
// @route   GET /api/services/provider/services
// @access  Private/Provider
exports.getProviderServices = async (req, res) => {
  try {
    // Find provider associated with user
    const provider = await Provider.findOne({ user: req.user._id });

    if (!provider) {
      return res.status(404).json({
        success: false,
        error: 'Provider not found'
      });
    }

    // Get services for this provider
    const services = await Service.find({ provider: provider._id });

    res.status(200).json({
      success: true,
      count: services.length,
      services
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};
