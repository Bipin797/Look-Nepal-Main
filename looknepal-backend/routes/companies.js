// routes/companies.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const Company = require('../models/Company');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Validation middleware for company creation
const validateCompanyCreation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Company name must be 2-100 characters'),
  body('description').trim().isLength({ min: 50, max: 2000 }).withMessage('Company description must be 50-2000 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('industry').isIn(['Technology', 'Finance', 'Healthcare', 'Education', 'Manufacturing', 'Construction', 'Retail', 'Hospitality', 'Transportation', 'Government', 'Non-profit', 'Other']).withMessage('Invalid industry'),
  body('companySize').isIn(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']).withMessage('Invalid company size'),
  body('address.city').trim().isLength({ min: 2 }).withMessage('City is required'),
  body('foundedYear').optional().isInt({ min: 1800, max: new Date().getFullYear() }).withMessage('Invalid founded year')
];

/**
 * @route   POST /api/companies
 * @desc    Create a new company profile
 * @access  Private (Employers only)
 */
router.post('/', authenticate, authorize('employer'), validateCompanyCreation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check if user already has a company
    if (req.user.company) {
      return res.status(400).json({
        message: 'You already have a company profile. Use update endpoint to modify it.'
      });
    }

    const {
      name,
      description,
      email,
      phone,
      website,
      address,
      industry,
      companySize,
      foundedYear,
      benefits,
      compulyCulture,
      socialMedia
    } = req.body;

    // Check if company name already exists
    const existingCompany = await Company.findOne({ name });
    if (existingCompany) {
      return res.status(409).json({
        message: 'A company with this name already exists'
      });
    }

    // Create new company
    const company = new Company({
      name,
      description,
      email,
      phone,
      website,
      address,
      industry,
      companySize,
      foundedYear,
      benefits: benefits || [],
      compulyCulture,
      socialMedia: socialMedia || {},
      owner: req.user._id
    });

    await company.save();

    // Update user to link to this company
    await User.findByIdAndUpdate(req.user._id, {
      company: company._id
    });

    res.status(201).json({
      message: 'Company created successfully',
      company: company.getPublicProfile()
    });

  } catch (error) {
    console.error('Company creation error:', error);
    res.status(500).json({
      message: 'Server error creating company',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/companies/my-company
 * @desc    Get current employer's company
 * @access  Private (Employers only)
 */
router.get('/my-company', authenticate, authorize('employer'), async (req, res) => {
  try {
    if (!req.user.company) {
      return res.status(404).json({
        message: 'No company profile found. Please create one first.'
      });
    }

    const company = await Company.findById(req.user.company);
    
    if (!company) {
      return res.status(404).json({
        message: 'Company profile not found'
      });
    }

    res.json({
      company: company.getPublicProfile()
    });

  } catch (error) {
    console.error('Error fetching user company:', error);
    res.status(500).json({
      message: 'Server error fetching company',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/companies/:slug
 * @desc    Get company by slug
 * @access  Public
 */
router.get('/:slug', async (req, res) => {
  try {
    const company = await Company.findBySlug(req.params.slug)
      .populate('owner', 'firstName lastName');
    
    if (!company) {
      return res.status(404).json({
        message: 'Company not found'
      });
    }

    // Increment profile views
    company.stats.profileViews += 1;
    await company.save();

    res.json({
      company: company.getPublicProfile()
    });

  } catch (error) {
    console.error('Error fetching company:', error);
    res.status(500).json({
      message: 'Server error fetching company',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/companies
 * @desc    Get all companies with filtering
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const {
      industry,
      companySize,
      city,
      search,
      page = 1,
      limit = 20
    } = req.query;

    let filters = { isActive: true };

    // Add filters
    if (industry) filters.industry = industry;
    if (companySize) filters.companySize = companySize;
    if (city) filters['address.city'] = new RegExp(city, 'i');

    let query = Company.find(filters);

    // Add search functionality
    if (search) {
      query = query.find({
        $or: [
          { name: new RegExp(search, 'i') },
          { description: new RegExp(search, 'i') }
        ]
      });
    }

    // Pagination
    const skip = (page - 1) * limit;
    const companies = await query
      .select('name slug description logo industry companySize address rating stats isVerified isPremium createdAt')
      .sort({ 'stats.profileViews': -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Get total count
    const totalCompanies = await Company.countDocuments(filters);

    res.json({
      companies,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(totalCompanies / limit),
        totalCompanies
      }
    });

  } catch (error) {
    console.error('Error fetching companies:', error);
    res.status(500).json({
      message: 'Server error fetching companies',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/companies/:id
 * @desc    Update company profile
 * @access  Private (Company owner only)
 */
router.put('/:id', authenticate, authorize('employer'), [
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Company name must be 2-100 characters'),
  body('description').optional().trim().isLength({ min: 50, max: 2000 }).withMessage('Company description must be 50-2000 characters'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('industry').optional().isIn(['Technology', 'Finance', 'Healthcare', 'Education', 'Manufacturing', 'Construction', 'Retail', 'Hospitality', 'Transportation', 'Government', 'Non-profit', 'Other']).withMessage('Invalid industry'),
  body('companySize').optional().isIn(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']).withMessage('Invalid company size'),
  body('foundedYear').optional().isInt({ min: 1800, max: new Date().getFullYear() }).withMessage('Invalid founded year')
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

    const company = await Company.findById(req.params.id);
    
    if (!company) {
      return res.status(404).json({
        message: 'Company not found'
      });
    }

    // Check if user owns this company
    if (company.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'You can only update your own company profile'
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'name', 'description', 'email', 'phone', 'website', 'address',
      'industry', 'companySize', 'foundedYear', 'benefits', 'compulyCulture',
      'socialMedia'
    ];

    const updates = Object.keys(req.body);
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({
        message: 'Invalid updates provided'
      });
    }

    // Check if name is being changed and if it conflicts
    if (req.body.name && req.body.name !== company.name) {
      const existingCompany = await Company.findOne({ name: req.body.name });
      if (existingCompany) {
        return res.status(409).json({
          message: 'A company with this name already exists'
        });
      }
    }

    updates.forEach((update) => {
      company[update] = req.body[update];
    });

    await company.save();

    res.json({
      message: 'Company updated successfully',
      company: company.getPublicProfile()
    });

  } catch (error) {
    console.error('Company update error:', error);
    res.status(500).json({
      message: 'Server error updating company',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/companies/:slug/jobs
 * @desc    Get all jobs for a specific company
 * @access  Public
 */
router.get('/:slug/jobs', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const company = await Company.findBySlug(req.params.slug);
    if (!company) {
      return res.status(404).json({
        message: 'Company not found'
      });
    }

    const Job = require('../models/Job');
    
    const skip = (page - 1) * limit;
    const jobs = await Job.find({
      company: company._id,
      status: 'active',
      applicationDeadline: { $gte: new Date() }
    })
      .select('title jobType category experienceLevel salary location applicationDeadline stats createdAt')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const totalJobs = await Job.countDocuments({
      company: company._id,
      status: 'active',
      applicationDeadline: { $gte: new Date() }
    });

    res.json({
      jobs,
      company: {
        name: company.name,
        slug: company.slug,
        logo: company.logo,
        industry: company.industry
      },
      pagination: {
        current: parseInt(page),
        total: Math.ceil(totalJobs / limit),
        totalJobs
      }
    });

  } catch (error) {
    console.error('Error fetching company jobs:', error);
    res.status(500).json({
      message: 'Server error fetching company jobs',
      error: error.message
    });
  }
});

module.exports = router;
