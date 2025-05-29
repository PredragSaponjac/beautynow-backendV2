const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please provide service name'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Please provide service description'],
    trim: true
  },
  duration: {
    type: Number,
    required: [true, 'Please provide service duration in minutes'],
    min: 5
  },
  price: {
    type: Number,
    required: [true, 'Please provide service price'],
    min: 0
  },
  category: {
    type: String,
    required: [true, 'Please provide service category'],
    enum: [
      // Beauty Services
      'hairStyling', 'haircuts', 'hairColoring', 'hairExtensions',
      'manicure', 'pedicure', 'facial', 'makeup', 'waxing',
      'lashExtensions', 'eyebrowStyling', 'sprayTanning',
      
      // Wellness & Massage
      'swedishMassage', 'deepTissue', 'hotStone', 'sportsMassage',
      'prenatalMassage', 'reflexology', 'acupuncture', 'cuppingTherapy',
      'reiki', 'privateYoga',
      
      // Mental Health & Consulting
      'therapySessions', 'counseling', 'psychologyConsultation',
      'lifeCoaching', 'careerCounseling', 'relationshipCounseling',
      'guidedMeditation', 'stressManagement',
      
      // Fitness & Personal Training
      'personalTraining', 'pilates', 'nutritionConsulting',
      'fitnessAssessment', 'assistedStretching',
      
      // Alternative Health
      'naturopathy', 'homeopathy', 'ayurvedicConsultation',
      'herbalistConsultation', 'energyHealing',
      
      // Adult-Only Massage
      'sensualMassage', 'tantricMassage', 'fullBodyMassage',
      'nuruMassage', 'fourHandsMassage', 'couplesMassage',
      
      // Legacy categories (for backward compatibility)
      'hair', 'nails', 'massage', 'skincare', 'makeup', 'other'
    ]
  },
  categoryGroup: {
    type: String,
    required: [true, 'Please provide service category group'],
    enum: [
      'beautyServices',
      'wellnessAndMassage',
      'mentalHealthAndConsulting',
      'fitnessAndPersonalTraining',
      'alternativeHealth',
      'adultOnlyMassage',
      'other'
    ]
  },
  isAdultOnly: {
    type: Boolean,
    default: false
  },
  requiresAgeVerification: {
    type: Boolean,
    default: function() {
      return this.isAdultOnly;
    }
  },
  availability: {
    monday: { available: Boolean, slots: [{ start: String, end: String }] },
    tuesday: { available: Boolean, slots: [{ start: String, end: String }] },
    wednesday: { available: Boolean, slots: [{ start: String, end: String }] },
    thursday: { available: Boolean, slots: [{ start: String, end: String }] },
    friday: { available: Boolean, slots: [{ start: String, end: String }] },
    saturday: { available: Boolean, slots: [{ start: String, end: String }] },
    sunday: { available: Boolean, slots: [{ start: String, end: String }] }
  },
  acceptsUrgentRequests: {
    type: Boolean,
    default: true
  },
  maxTravelDistance: {
    type: Number,
    default: 10 // in miles
  },
  priceRange: {
    min: {
      type: Number,
      required: [true, 'Please provide minimum price']
    },
    max: {
      type: Number,
      required: [true, 'Please provide maximum price']
    }
  },
  images: [{
    url: String,
    alt: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field on save
serviceSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Set isAdultOnly based on category
serviceSchema.pre('save', function(next) {
  const adultCategories = [
    'sensualMassage', 'tantricMassage', 'fullBodyMassage',
    'nuruMassage', 'fourHandsMassage', 'couplesMassage'
  ];
  
  if (adultCategories.includes(this.category)) {
    this.isAdultOnly = true;
    this.requiresAgeVerification = true;
    this.categoryGroup = 'adultOnlyMassage';
  }
  
  next();
});

module.exports = mongoose.model('Service', serviceSchema);
