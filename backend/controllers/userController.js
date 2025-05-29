const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// User controller functions
const User = require('../models/User');

// @desc    Register user
// @route   POST /api/users/register
// @access  Public
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Split name into firstName and lastName
    let firstName = name;
    let lastName = '';
    
    if (name && name.includes(' ')) {
      const nameParts = name.trim().split(' ');
      firstName = nameParts[0];
      lastName = nameParts.slice(1).join(' ');
    }

    // Create user
    const user = await User.create({
      name,
      firstName,
      lastName,
      email,
      password,
      phone,
      role: role || 'customer'
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profileImage: user.profileImage,
        location: user.location,
        preferences: user.preferences,
        favoriteProviders: user.favoriteProviders,
        isVerified: user.isVerified,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update name and split into firstName and lastName if provided
    if (req.body.name) {
      user.name = req.body.name;
      
      const nameParts = req.body.name.trim().split(' ');
      if (nameParts.length > 1) {
        user.firstName = nameParts[0];
        user.lastName = nameParts.slice(1).join(' ');
      } else {
        user.firstName = req.body.name;
      }
    }

    // Update other fields if provided
    if (req.body.firstName) user.firstName = req.body.firstName;
    if (req.body.lastName) user.lastName = req.body.lastName;
    if (req.body.email) user.email = req.body.email;
    if (req.body.phone) user.phone = req.body.phone;
    if (req.body.profileImage) user.profileImage = req.body.profileImage;
    
    // Update location if provided
    if (req.body.location) {
      user.location = {
        ...user.location,
        ...req.body.location
      };
    }
    
    // Update preferences if provided
    if (req.body.preferences) {
      user.preferences = {
        ...user.preferences,
        ...req.body.preferences
      };
    }

    // Update password if provided
    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        profileImage: updatedUser.profileImage,
        location: updatedUser.location,
        preferences: updatedUser.preferences,
        isVerified: updatedUser.isVerified
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Add provider to favorites
// @route   POST /api/users/favorites/:providerId
// @access  Private
exports.addFavoriteProvider = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const providerId = req.params.providerId;

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if provider already in favorites
    if (user.favoriteProviders.includes(providerId)) {
      return res.status(400).json({
        success: false,
        error: 'Provider already in favorites'
      });
    }

    user.favoriteProviders.push(providerId);
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Provider added to favorites'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Remove provider from favorites
// @route   DELETE /api/users/favorites/:providerId
// @access  Private
exports.removeFavoriteProvider = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const providerId = req.params.providerId;

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if provider in favorites
    if (!user.favoriteProviders.includes(providerId)) {
      return res.status(400).json({
        success: false,
        error: 'Provider not in favorites'
      });
    }

    user.favoriteProviders = user.favoriteProviders.filter(
      id => id.toString() !== providerId
    );
    
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Provider removed from favorites'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update notification preferences
// @route   PUT /api/users/notifications
// @access  Private
exports.updateNotificationPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Update notification preferences
    if (req.body.preferences && req.body.preferences.notificationPreferences) {
      user.preferences.notificationPreferences = {
        ...user.preferences.notificationPreferences,
        ...req.body.preferences.notificationPreferences
      };
    }

    await user.save();

    res.status(200).json({
      success: true,
      notificationPreferences: user.preferences.notificationPreferences
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d'
  });
};
