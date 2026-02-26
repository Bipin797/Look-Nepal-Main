// routes/jobs.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const Job = require('../models/Job');
const Company = require('../models/Company');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Validation middleware for job creation
const validateJobCreation = [
  body('title').trim().isLength({ min: 3, max: 100 }).withMessage('Job title must be 3-100 characters'),
  body('description').trim().isLength({ min: 50, max: 5000 }).withMessage('Job description must be 50-5000 characters'),
  body('requirements').trim().isLength({ min: 20, max: 3000 }).withMessage('Job requirements must be 20-3000 characters'),
  body('jobType').isIn(['full-time', 'part-time', 'contract', 'internship', 'remote', 'freelance']).withMessage('Invalid job type'),
  body('category').isIn(['Technology', 'Marketing', 'Sales', 'Finance', 'Human Resources', 'Operations', 'Customer Service', 'Design', 'Healthcare', 'Education', 'Engineering', 'Legal', 'Other']).withMessage('Invalid category'),
  body('experienceLevel').isIn(['entry', 'mid', 'senior', 'executive']).withMessage('Invalid experience level'),
  body('salary.min').isNumeric().withMessage('Minimum salary must be a number'),
  body('salary.max').isNumeric().withMessage('Maximum salary must be a number'),
  body('location.city').trim().isLength({ min: 2 }).withMessage('City is required'),
  body('applicationDeadline').isISO8601().withMessage('Valid application deadline is required'),
  body('requiredSkills').isArray({ min: 1 }).withMessage('At least one required skill must be provided')
];

/**
 * @route   GET /api/jobs/suggestions
 * @desc    Get autocomplete suggestions for job matching keyword
 * @access  Public
 */
router.get('/suggestions', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const suggestions = await Job.find({
      status: 'active',
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { 'company.name': { $regex: q, $options: 'i' } } // Need to populate or search differently if company is an ObjectId
      ]
    })
      .select('title company')
      .populate('company', 'name')
      .limit(5)
      .lean();

    // Map to simple array of objects
    const formatted = suggestions.map(job => ({
      _id: job._id,
      title: job.title,
      company: job.company ? job.company.name : 'Unknown Company'
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching job suggestions:', error);
    res.status(500).json({ message: 'Server error fetching suggestions' });
  }
});

/**
 * @route   GET /api/jobs
 * @desc    Get all public jobs with filtering and pagination
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const {
      keyword,
      location,
      type,
      category,
      experience,
      minSalary,
      remoteSetting,
      company,
      page = 1,
      limit = 10
    } = req.query;

    // Build filter object
    let filters = { status: 'active' }; // Only show active jobs

    // Keyword search (title or description)
    if (keyword) {
      filters.$or = [
        { title: { $regex: keyword, $options: 'i' } },
        { description: { $regex: keyword, $options: 'i' } },
        { 'requiredSkills': { $regex: keyword, $options: 'i' } }
      ];
    }

    // Location search
    if (location) {
      filters['location.city'] = { $regex: location, $options: 'i' };
    }

    // Job Type filter
    if (type) {
      filters.jobType = type;
    }

    // Category filter
    if (category) {
      filters.category = category;
    }

    // Experience Level filter
    if (experience) {
      filters.experienceLevel = experience;
    }

    // Minimum Salary filter
    if (minSalary) {
      filters['salary.min'] = { $gte: parseInt(minSalary) };
    }

    // Remote Filter
    if (remoteSetting) {
      if (remoteSetting === 'remote') {
        filters['location.isRemote'] = true;
      } else if (remoteSetting === 'on-site' || remoteSetting === 'hybrid') {
        filters['location.isRemote'] = false;
      }
    }

    // Don't show expired jobs
    filters.applicationDeadline = { $gte: new Date() };

    const skip = (page - 1) * limit;

    const jobs = await Job.find(filters)
      .populate('company', 'name logo slug industry')
      .select('-applications -applicationEmail -externalApplicationUrl') // Exclude sensitive/unnecessary fields for list view
      .sort({ createdAt: -1 }) // Newest first
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const totalJobs = await Job.countDocuments(filters);

    res.json({
      jobs,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(totalJobs / limit),
        totalJobs
      }
    });

  } catch (error) {
    console.error('Error fetching public jobs:', error);
    res.status(500).json({
      message: 'Server error fetching jobs',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/jobs/:id
 * @desc    Get single job details
 * @access  Public
 */
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('company', 'name logo slug industry description website location')
      .populate('postedBy', 'firstName lastName'); // Optional: show recruiter name? Maybe not for public.

    if (!job) {
      return res.status(404).json({
        message: 'Job not found'
      });
    }

    // Check if job is active (unless it's the owner viewing, but this is a public route)
    // For simplicity, we'll just return it, but frontend should handle "closed" status visually.
    // Or we can restrict:
    // if (job.status !== 'active') { ... } 

    // Increment view count (simple implementation)
    // await Job.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });

    res.json({
      job
    });

  } catch (error) {
    console.error('Error fetching job details:', error);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.status(500).json({
      message: 'Server error fetching job details',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/jobs
 * @desc    Create a new job posting
 * @access  Private (Employers only)
 */
router.post('/', authenticate, authorize('employer'), validateJobCreation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      title,
      description,
      requirements,
      responsibilities,
      jobType,
      category,
      experienceLevel,
      salary,
      location,
      requiredSkills,
      preferredSkills,
      education,
      benefits,
      applicationDeadline,
      applicationMethod,
      externalApplicationUrl,
      applicationEmail,
      isUrgent,
      tags
    } = req.body;

    // Validate salary range
    if (salary.min >= salary.max) {
      return res.status(400).json({
        message: 'Maximum salary must be greater than minimum salary'
      });
    }

    // Check if user has a company
    if (!req.user.company) {
      return res.status(400).json({
        message: 'You must create a company profile before posting jobs'
      });
    }

    // Verify company exists and user owns it
    const company = await Company.findById(req.user.company);
    if (!company || company.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'You do not have permission to post jobs for this company'
      });
    }

    // Create new job
    const job = new Job({
      title,
      description,
      requirements,
      responsibilities,
      jobType,
      category,
      experienceLevel,
      salary,
      location,
      company: company._id,
      postedBy: req.user._id,
      requiredSkills,
      preferredSkills,
      education,
      benefits,
      applicationDeadline: new Date(applicationDeadline),
      applicationMethod: applicationMethod || 'platform',
      externalApplicationUrl,
      applicationEmail,
      isUrgent: isUrgent || false,
      tags: tags || []
    });

    await job.save();

    // Update company stats
    await Company.findByIdAndUpdate(company._id, {
      $inc: { 'stats.totalJobs': 1, 'stats.activeJobs': 1 }
    });

    // Populate company info before sending response
    await job.populate('company', 'name logo slug industry address');

    res.status(201).json({
      message: 'Job created successfully',
      job: job.getPublicInfo()
    });

  } catch (error) {
    console.error('Job creation error:', error);
    res.status(500).json({
      message: 'Server error creating job',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/jobs/analytics
 * @desc    Get dashboard analytics (job views, application counts, status breakdowns)
 * @access  Private (Employers only)
 */
router.get('/analytics', authenticate, authorize('employer'), async (req, res) => {
  try {
    // 1. Find all jobs posted by this employer
    const employerJobs = await Job.find({ postedBy: req.user._id }, '_id title createdAt');
    const jobIds = employerJobs.map(job => job._id);

    // If they have no jobs, return zeroed data
    if (jobIds.length === 0) {
      return res.json({
        totalJobs: 0,
        totalApplications: 0,
        statusBreakdown: { pending: 0, reviewed: 0, shortlisted: 0, rejected: 0, accepted: 0 },
        applicationsOverTime: []
      });
    }

    // 2. Aggregate Application Status Breakdown
    const statusAggregation = await require('../models/Application').aggregate([
      { $match: { job: { $in: jobIds } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const statusBreakdown = { pending: 0, reviewed: 0, shortlisted: 0, rejected: 0, accepted: 0 };
    let totalApplications = 0;

    statusAggregation.forEach(stat => {
      if (statusBreakdown[stat._id] !== undefined) {
        statusBreakdown[stat._id] = stat.count;
      }
      totalApplications += stat.count;
    });

    // 3. Aggregate Applications Over Time (Last 30 Days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const timeAggregation = await require('../models/Application').aggregate([
      {
        $match: {
          job: { $in: jobIds },
          appliedAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$appliedAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    // Format for Chart.js [ { date: 'YYYY-MM-DD', count: X } ]
    const applicationsOverTime = timeAggregation.map(item => ({
      date: item._id,
      count: item.count
    }));

    res.json({
      totalJobs: employerJobs.length,
      totalApplications,
      statusBreakdown,
      applicationsOverTime
    });

  } catch (error) {
    console.error('Analytics aggregation error:', error);
    res.status(500).json({
      message: 'Server error generating analytics',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/jobs/my-jobs
 * @desc    Get current employer's job postings
 * @access  Private (Employers only)
 */
router.get('/my-jobs', authenticate, authorize('employer'), async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let filters = { postedBy: req.user._id };
    if (status) {
      filters.status = status;
    }

    const skip = (page - 1) * limit;

    const jobs = await Job.find(filters)
      .populate('company', 'name logo slug')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const totalJobs = await Job.countDocuments(filters);

    res.json({
      jobs,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(totalJobs / limit),
        totalJobs
      }
    });

  } catch (error) {
    console.error('Error fetching employer jobs:', error);
    res.status(500).json({
      message: 'Server error fetching jobs',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/jobs/:id
 * @desc    Update a job posting
 * @access  Private (Job owner only)
 */
router.put('/:id', authenticate, authorize('employer'), [
  body('title').optional().trim().isLength({ min: 3, max: 100 }).withMessage('Job title must be 3-100 characters'),
  body('description').optional().trim().isLength({ min: 50, max: 5000 }).withMessage('Job description must be 50-5000 characters'),
  body('requirements').optional().trim().isLength({ min: 20, max: 3000 }).withMessage('Job requirements must be 20-3000 characters'),
  body('jobType').optional().isIn(['full-time', 'part-time', 'contract', 'internship', 'remote', 'freelance']).withMessage('Invalid job type'),
  body('category').optional().isIn(['Technology', 'Marketing', 'Sales', 'Finance', 'Human Resources', 'Operations', 'Customer Service', 'Design', 'Healthcare', 'Education', 'Engineering', 'Legal', 'Other']).withMessage('Invalid category'),
  body('experienceLevel').optional().isIn(['entry', 'mid', 'senior', 'executive']).withMessage('Invalid experience level'),
  body('status').optional().isIn(['draft', 'active', 'paused', 'closed']).withMessage('Invalid status')
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

    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        message: 'Job not found'
      });
    }

    // Check if user owns this job
    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'You can only update your own job postings'
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'title', 'description', 'requirements', 'responsibilities',
      'jobType', 'category', 'experienceLevel', 'salary', 'location',
      'requiredSkills', 'preferredSkills', 'education', 'benefits',
      'applicationDeadline', 'applicationMethod', 'externalApplicationUrl',
      'applicationEmail', 'isUrgent', 'tags', 'status'
    ];

    const updates = Object.keys(req.body);
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({
        message: 'Invalid updates provided'
      });
    }

    updates.forEach((update) => {
      job[update] = req.body[update];
    });

    // Validate salary range if being updated
    if (req.body.salary && req.body.salary.min >= req.body.salary.max) {
      return res.status(400).json({
        message: 'Maximum salary must be greater than minimum salary'
      });
    }

    await job.save();

    res.json({
      message: 'Job updated successfully',
      job: job.getPublicInfo()
    });

  } catch (error) {
    console.error('Job update error:', error);
    res.status(500).json({
      message: 'Server error updating job',
      error: error.message
    });
  }
});

/**
 * @route   DELETE /api/jobs/:id
 * @desc    Delete a job posting
 * @access  Private (Job owner only)
 */
router.delete('/:id', authenticate, authorize('employer'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        message: 'Job not found'
      });
    }

    // Check if user owns this job
    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'You can only delete your own job postings'
      });
    }

    // Soft delete - change status to closed instead of removing
    job.status = 'closed';
    await job.save();

    // Update company stats
    if (job.status === 'active') {
      await Company.findByIdAndUpdate(job.company, {
        $inc: { 'stats.activeJobs': -1 }
      });
    }

    res.json({
      message: 'Job deleted successfully'
    });

  } catch (error) {
    console.error('Job deletion error:', error);
    res.status(500).json({
      message: 'Server error deleting job',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/jobs/:id/toggle-status
 * @desc    Toggle job status (active/paused)
 * @access  Private (Job owner only)
 */
router.post('/:id/toggle-status', authenticate, authorize('employer'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        message: 'Job not found'
      });
    }

    // Check if user owns this job
    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'You can only modify your own job postings'
      });
    }

    // Toggle between active and paused
    const newStatus = job.status === 'active' ? 'paused' : 'active';

    // Don't allow reactivation of expired jobs
    if (job.isExpired() && newStatus === 'active') {
      return res.status(400).json({
        message: 'Cannot activate expired job. Please update the application deadline.'
      });
    }

    job.status = newStatus;
    await job.save();

    res.json({
      message: `Job ${newStatus === 'active' ? 'activated' : 'paused'} successfully`,
      job: {
        id: job._id,
        title: job.title,
        status: job.status
      }
    });

  } catch (error) {
    console.error('Job status toggle error:', error);
    res.status(500).json({
      message: 'Server error updating job status',
      error: error.message
    });
  }
});

module.exports = router;
