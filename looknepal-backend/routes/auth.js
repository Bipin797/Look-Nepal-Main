// routes/auth.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { authenticate } = require('../middleware/auth');
const { uploadResume, handleUploadError } = require('../middleware/upload');
const { sendEmail } = require('../utils/email');
const crypto = require('crypto');
const fs = require('fs');
const pdfParse = require('pdf-parse');

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

    // Generate Verification Token
    const verificationToken = crypto.randomBytes(20).toString('hex');
    user.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
    user.emailVerificationExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    await user.save();

    // Send Verification Email (non-blocking)
    const verificationUrl = `http://localhost:5500/verify-email.html?token=${verificationToken}`;

    sendEmail({
      to: user.email,
      subject: 'Verify your Look Nepal account',
      html: `
        <h3>Welcome to Look Nepal, ${user.firstName}!</h3>
        <p>Please click the button below to verify your email address and activate your account.</p>
        <a href="${verificationUrl}" style="display:inline-block;padding:10px 20px;color:white;background-color:#0d6efd;text-decoration:none;border-radius:5px;">Verify Email</a>
        <br/><br/>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p>${verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
      `
    }).catch(err => console.error('Failed to send verification email:', err));

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

    // AI Resume Parsing Logic
    let extractedSkills = [];
    let extractedEducation = [];

    try {
      if (req.file.mimetype === 'application/pdf') {
        const dataBuffer = fs.readFileSync(req.file.path);
        const pdfData = await pdfParse(dataBuffer);
        const text = pdfData.text.toLowerCase();

        // Basic Keyword Extraction Map
        const skillKeywords = ['javascript', 'python', 'java', 'react', 'node.js', 'html', 'css', 'sql', 'mongodb', 'docker', 'kubernetes', 'aws', 'agile', 'management', 'marketing', 'sales'];
        const eduKeywords = ['bachelor', 'master', 'phd', 'b.s.', 'm.s.', 'b.a.', 'university', 'college', 'institute'];

        skillKeywords.forEach(skill => {
          if (text.includes(skill) && !req.user.skills?.includes(skill)) {
            extractedSkills.push(skill);
          }
        });

        eduKeywords.forEach(edu => {
          if (text.includes(edu) && !req.user.education?.includes(edu)) {
            extractedEducation.push(edu);
          }
        });

        // Merge extracted data into user profile
        if (extractedSkills.length > 0) {
          req.user.skills = [...new Set([...(req.user.skills || []), ...extractedSkills])];
        }
        if (extractedEducation.length > 0) {
          req.user.education = [...new Set([...(req.user.education || []), ...extractedEducation])];
        }
      }
    } catch (parseError) {
      console.error("Failed to parse PDF:", parseError);
      // We don't want to crash the upload if parsing fails, so we swallow this specific error.
    }

    await req.user.save();

    res.json({
      message: 'Resume uploaded successfully',
      resume: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        uploadDate: req.user.resume.uploadDate
      },
      parsedData: {
        skillsAdded: extractedSkills,
        educationAdded: extractedEducation
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

/**
 * @route   GET /api/auth/verify-email/:token
 * @desc    Verify user email address using the emailed token
 * @access  Public
 */
router.get('/verify-email/:token', async (req, res) => {
  try {
    // Get hashed token to match the database
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired verification token'
      });
    }

    // Set new verification status
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpire = undefined;

    await user.save();

    res.status(200).json({
      message: 'Email successfully verified'
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      message: 'Server error during email verification',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Get password reset token via email
 * @access  Public
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });

    if (!user) {
      // Return 200 anyway to prevent email enumeration
      return res.status(200).json({ message: 'If an account exists, a reset email will be sent.' });
    }

    // Get reset token (generates plain text token, saves hashed token to DB internally)
    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave: false });

    // Create reset url
    const resetUrl = `http://localhost:5500/reset-password.html?token=${resetToken}`;

    const message = `
      <h3>Password Reset Request</h3>
      <p>We received a request to reset your Look Nepal password.</p>
      <p>Click the button below to set a new password:</p>
      <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;color:white;background-color:#0d6efd;text-decoration:none;border-radius:5px;">Reset Password</a>
      <br/><br/>
      <p>If you did not request this, please ignore this email.</p>
      <p>This link is valid for 10 minutes.</p>
    `;

    try {
      await sendEmail({
        to: user.email,
        subject: 'Look Nepal Password Reset Request',
        html: message
      });

      res.status(200).json({ message: 'If an account exists, a reset email will be sent.' });
    } catch (err) {
      console.error(err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save({ validateBeforeSave: false });

      return res.status(500).json({ message: 'Email could not be sent' });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error parsing reset request' });
  }
});

/**
 * @route   PUT /api/auth/reset-password/:token
 * @desc    Reset password using token
 * @access  Public
 */
router.put('/reset-password/:token', async (req, res) => {
  try {
    // Hash the generic token from URL
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    if (!req.body.password || req.body.password.length < 6) {
      return res.status(400).json({ message: 'Please provide a valid password of at least 6 characters' });
    }

    // Set new password (the pre-save Model hook will hash it automatically)
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.status(200).json({
      message: 'Password automatically updated. Please log in with your new credentials.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error resetting password' });
  }
});

module.exports = router;
