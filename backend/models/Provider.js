const mongoose = require('mongoose');

const providerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  businessName: {
    type: String,
    required: [true, 'Please provide your business name'],
    trim: true
  },
  firstName: {
    type: String,
    required: [true, 'Please provide your first name'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Please provide your last name'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  address: {
    street: {
      type: String,
      required: [true, 'Please provide your street address']
    },
    city: {
      type: String,
      required: [true, 'Please provide your city']
    },
    state: {
      type: String,
      required: [true, 'Please provide your state']
    },
    zipCode: {
      type: String,
      required: [true, 'Please provide your ZIP code']
    },
    country: {
      type: String,
      default: 'USA'
    }
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      index: '2dsphere'
    }
  },
  contactInfo: {
    phone: {
      type: String,
      required: [true, 'Please provide your phone number']
    },
    email: {
      type: String,
      required: [true, 'Please provide your email address']
    },
    website: String
  },
  serviceCategories: {
    beautyServices: {
      hairStyling: Boolean,
      haircuts: Boolean,
      hairColoring: Boolean,
      hairExtensions: Boolean,
      manicure: Boolean,
      pedicure: Boolean,
      facial: Boolean,
      makeup: Boolean,
      waxing: Boolean,
      lashExtensions: Boolean,
      eyebrowStyling: Boolean,
      sprayTanning: Boolean
    },
    wellnessAndMassage: {
      swedishMassage: Boolean,
      deepTissue: Boolean,
      hotStone: Boolean,
      sportsMassage: Boolean,
      prenatalMassage: Boolean,
      reflexology: Boolean,
      acupuncture: Boolean,
      cuppingTherapy: Boolean,
      reiki: Boolean,
      privateYoga: Boolean
    },
    mentalHealthAndConsulting: {
      therapySessions: Boolean,
      counseling: Boolean,
      psychologyConsultation: Boolean,
      lifeCoaching: Boolean,
      careerCounseling: Boolean,
      relationshipCounseling: Boolean,
      guidedMeditation: Boolean,
      stressManagement: Boolean
    },
    fitnessAndPersonalTraining: {
      personalTraining: Boolean,
      pilates: Boolean,
      nutritionConsulting: Boolean,
      fitnessAssessment: Boolean,
      assistedStretching: Boolean
    },
    alternativeHealth: {
      naturopathy: Boolean,
      homeopathy: Boolean,
      ayurvedicConsultation: Boolean,
      herbalistConsultation: Boolean,
      energyHealing: Boolean
    },
    adultOnlyMassage: {
      sensualMassage: Boolean,
      tantricMassage: Boolean,
      fullBodyMassage: Boolean,
      nuruMassage: Boolean,
      fourHandsMassage: Boolean,
      couplesMassage: Boolean
    }
  },
  services: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  }],
  availability: {
    monday: { start: String, end: String, isAvailable: Boolean },
    tuesday: { start: String, end: String, isAvailable: Boolean },
    wednesday: { start: String, end: String, isAvailable: Boolean },
    thursday: { start: String, end: String, isAvailable: Boolean },
    friday: { start: String, end: String, isAvailable: Boolean },
    saturday: { start: String, end: String, isAvailable: Boolean },
    sunday: { start: String, end: String, isAvailable: Boolean }
  },
  notificationPreferences: {
    sms: {
      enabled: {
        type: Boolean,
        default: true
      },
      phoneNumber: String,
      newRequests: {
        type: Boolean,
        default: true
      },
      requestReminders: {
        type: Boolean,
        default: true
      },
      appointmentReminders: {
        type: Boolean,
        default: true
      },
      clientCancellations: {
        type: Boolean,
        default: true
      },
      newReviews: {
        type: Boolean,
        default: false
      },
      paymentNotifications: {
        type: Boolean,
        default: false
      },
      quietHours: {
        enabled: {
          type: Boolean,
          default: false
        },
        start: String,
        end: String
      }
    },
    email: {
      enabled: {
        type: Boolean,
        default: true
      },
      address: String,
      newRequests: {
        type: Boolean,
        default: true
      },
      dailySummary: {
        type: Boolean,
        default: true
      },
      weeklyReport: {
        type: Boolean,
        default: true
      },
      marketingUpdates: {
        type: Boolean,
        default: false
      }
    }
  },
  subscription: {
    status: {
      type: String,
      enum: ['trial', 'active', 'expired', 'cancelled'],
      default: 'trial'
    },
    trialStartDate: {
      type: Date,
      default: Date.now
    },
    trialEndDate: {
      type: Date,
      default: function() {
        const date = new Date(this.trialStartDate);
        date.setMonth(date.getMonth() + 3); // 3-month trial
        return date;
      }
    },
    plan: {
      type: String,
      enum: ['monthly'],
      default: 'monthly'
    },
    price: {
      type: Number,
      default: 20.00 // $20 per month
    },
    paymentMethod: {
      type: String,
      default: null
    },
    lastPaymentDate: Date,
    nextPaymentDate: Date
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    text: String,
    rating: Number,
    date: {
      type: Date,
      default: Date.now
    }
  }],
  stats: {
    completedServices: {
      type: Number,
      default: 0
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    acceptanceRate: {
      type: Number,
      default: 0
    }
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isAdultServiceProvider: {
    type: Boolean,
    default: false
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
providerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Provider', providerSchema);
