const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider',
    required: true
  },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true
  },
  serviceDetails: {
    name: String,
    category: String,
    duration: Number,
    price: Number
  },
  date: {
    type: Date,
    required: [true, 'Please provide booking date and time']
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'confirmed', 'completed', 'cancelled', 'no-show'],
    default: 'pending'
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  requestedTime: {
    type: String,
    enum: ['ASAP', 'Today', 'Tomorrow', 'This Week', 'Custom'],
    default: 'ASAP'
  },
  customerLocation: {
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String
    },
    coordinates: {
      type: [Number],
      index: '2dsphere'
    }
  },
  providerLocation: {
    coordinates: {
      type: [Number],
      index: '2dsphere'
    }
  },
  distanceToCustomer: {
    type: Number, // in miles
    default: 0
  },
  notes: {
    type: String,
    trim: true
  },
  totalPrice: {
    type: Number,
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'refunded', 'failed'],
    default: 'pending'
  },
  notifications: {
    customerNotified: {
      type: Boolean,
      default: false
    },
    providerNotified: {
      type: Boolean,
      default: false
    },
    reminderSent: {
      type: Boolean,
      default: false
    }
  },
  feedback: {
    customerRating: {
      type: Number,
      min: 1,
      max: 5
    },
    customerReview: String,
    providerRating: {
      type: Number,
      min: 1,
      max: 5
    },
    providerReview: String
  },
  timeline: [{
    status: {
      type: String,
      enum: ['requested', 'accepted', 'declined', 'confirmed', 'completed', 'cancelled', 'no-show']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String
  }],
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
bookingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Add status change to timeline if status has changed
  if (this.isModified('status')) {
    this.timeline.push({
      status: this.status,
      timestamp: new Date(),
      note: `Status changed to ${this.status}`
    });
  }
  
  next();
});

// Initialize timeline on new booking
bookingSchema.pre('save', function(next) {
  if (this.isNew) {
    this.timeline.push({
      status: 'requested',
      timestamp: new Date(),
      note: 'Service requested'
    });
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
