// routes/auth.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { authenticate } = require('../middleware/auth');
const { uploadResume, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// Validation middleware
const validateRegistration = [
  body('firstName').trim().isLength({ min: 2 }).withMessage('First name must be at least 2 characters'),
  body('lastName').trim().isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('userType').isIn(['job_seeker', 'employer']).withMessage('User type must be job_seeker or employer'),
  body('phone').optional().isMobilePhone().withMessage('Please provide a valid phone number')
];

const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', validateRegistration, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { firstName, lastName, email, password, userType, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const user = new User({
      firstName,
      lastName,
      email,
      password,
      userType,
      phone
    });

    await user.save();

    // Generate JWT token
    const token = generateToken({
      userId: user._id,
      userType: user.userType
    });

    // Return user data without password
    const userData = user.getPublicProfile();

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: userData
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      message: 'Server error during registration',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', validateLogin, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = generateToken({
      userId: user._id,
      userType: user.userType
    });

    // Return user data without password
    const userData = user.getPublicProfile();

    res.json({
      message: 'Login successful',
      token,
      user: userData
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Server error during login',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    const userData = req.user.getPublicProfile();
    res.json({
      user: userData
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      message: 'Server error fetching profile',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticate, [
  body('firstName').optional().trim().isLength({ min: 2 }).withMessage('First name must be at least 2 characters'),
  body('lastName').optional().trim().isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
  body('phone').optional().isMobilePhone().withMessage('Please provide a valid phone number'),
  body('location.city').optional().trim().isLength({ min: 2 }).withMessage('City must be at least 2 characters'),
  body('skills').optional().isArray().withMessage('Skills must be an array'),
  body('experience').optional().isIn(['entry', 'mid', 'senior', 'executive']).withMessage('Invalid experience level')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const allowedUpdates = [
      'firstName', 'lastName', 'phone', 'location', 'skills',
      'experience', 'expectedSalary', 'jobPreferences', 'workExperience', 'education'
    ];

    const updates = Object.keys(req.body);
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({
        message: 'Invalid updates provided'
      });
    }

    updates.forEach((update) => {
      req.user[update] = req.body[update];
    });

    await req.user.save();

    const userData = req.user.getPublicProfile();

    res.json({
      message: 'Profile updated successfully',
      user: userData
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      message: 'Server error updating profile',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/auth/upload-resume
 * @desc    Upload user resume
 * @access  Private (Job seekers only)
 */
router.post('/upload-resume', authenticate, uploadResume, handleUploadError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'No file uploaded'
      });
    }

    // Update user with resume info
    req.user.resume = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      uploadDate: new Date()
    };

    await req.user.save();

    res.json({
      message: 'Resume uploaded successfully',
      resume: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        uploadDate: req.user.resume.uploadDate
      }
    });

  } catch (error) {
    console.error('Resume upload error:', error);
    res.status(500).json({
      message: 'Server error uploading resume',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    // In a more advanced system, you might want to blacklist the token
    // For now, we just send a success response
    res.json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      message: 'Server error during logout',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/auth/social-login
 * @desc    Login or register with social account
 * @access  Public
 */
router.post('/social-login', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('provider').isIn(['google', 'facebook']).withMessage('Invalid provider'),
  body('providerId').notEmpty().withMessage('Provider ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, firstName, lastName, provider, providerId, photoUrl } = req.body;

    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      // User exists, update social login info if needed
      if (!user.socialLogin) user.socialLogin = {};

      // If the specific provider ID is missing for this user, add it
      if (!user.socialLogin[provider] || user.socialLogin[provider].id !== providerId) {
        user.socialLogin[provider] = { id: providerId, email };
        await user.save();
      }
    } else {
      // Create new user
      const socialLoginData = {};
      socialLoginData[provider] = { id: providerId, email };

      user = new User({
        firstName,
        lastName,
        email,
        userType: 'job_seeker', // Default to job seeker for social login
        socialLogin: socialLoginData,
        isVerified: true, // Social login emails are verified by provider
        profilePicture: photoUrl || ''
      });

      await user.save();
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated.' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT
    const token = generateToken({
      userId: user._id,
      userType: user.userType
    });

    res.json({
      message: 'Login successful',
      token,
      user: user.getPublicProfile()
    });

  } catch (error) {
    console.error('Social login error:', error);
    res.status(500).json({ message: 'Server error during social login', error: error.message });
  }
});

module.exports = router;
