const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide your name'],
    trim: true
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false
  },
  phone: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['customer', 'provider', 'admin'],
    default: 'customer'
  },
  profileImage: {
    type: String,
    default: null
  },
  location: {
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    coordinates: {
      type: [Number],
      index: '2dsphere'
    }
  },
  preferences: {
    serviceCategories: [String],
    maxDistance: {
      type: Number,
      default: 10 // in miles
    },
    notificationPreferences: {
      email: {
        enabled: {
          type: Boolean,
          default: true
        },
        bookingConfirmations: {
          type: Boolean,
          default: true
        },
        reminders: {
          type: Boolean,
          default: true
        },
        promotions: {
          type: Boolean,
          default: false
        }
      },
      sms: {
        enabled: {
          type: Boolean,
          default: true
        },
        bookingConfirmations: {
          type: Boolean,
          default: true
        },
        reminders: {
          type: Boolean,
          default: true
        }
      },
      pushNotifications: {
        enabled: {
          type: Boolean,
          default: true
        }
      }
    }
  },
  favoriteProviders: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider'
  }],
  paymentMethods: [{
    type: {
      type: String,
      enum: ['card', 'paypal', 'applepay', 'googlepay'],
    },
    isDefault: Boolean,
    lastFour: String,
    expiryDate: String,
    token: String
  }],
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Encrypt password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Update the updatedAt field on save
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Split name into firstName and lastName if they're not set
userSchema.pre('save', function(next) {
  if (this.name && (!this.firstName || !this.lastName)) {
    const nameParts = this.name.trim().split(' ');
    if (nameParts.length > 1) {
      this.firstName = nameParts[0];
      this.lastName = nameParts.slice(1).join(' ');
    } else {
      this.firstName = this.name;
      this.lastName = '';
    }
  }
  next();
});

// Method to check if password matches
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
