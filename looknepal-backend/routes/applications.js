// routes/applications.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const { sendEmail } = require('../utils/email');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Validation middleware for job application
const validateApplication = [
  body('jobId').isMongoId().withMessage('Valid job ID is required'),
  body('coverLetter').optional().trim().isLength({ max: 2000 }).withMessage('Cover letter must not exceed 2000 characters')
];

/**
 * @route   POST /api/applications
 * @desc    Apply to a job
 * @access  Private (Job seekers only)
 */
router.post('/', authenticate, authorize('job_seeker'), validateApplication, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { jobId, coverLetter } = req.body;

    // Check if job exists and is still active
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        message: 'Job not found'
      });
    }

    if (job.status !== 'active') {
      return res.status(400).json({
        message: 'This job is no longer accepting applications'
      });
    }

    if (job.isExpired()) {
      return res.status(400).json({
        message: 'The application deadline for this job has passed'
      });
    }

    // Check if user has already applied
    const existingApplication = await Application.findOne({
      job: jobId,
      applicant: req.user._id
    });

    if (existingApplication) {
      return res.status(409).json({
        message: 'You have already applied to this job'
      });
    }

    // Create new application
    const application = new Application({
      job: jobId,
      applicant: req.user._id,
      coverLetter: coverLetter || ''
    });

    await application.save();

    // Update job application count
    await Job.findByIdAndUpdate(jobId, {
      $inc: { 'stats.applications': 1 }
    });

    // Populate job and applicant info before sending response
    await application.populate('job', 'title company');
    await application.populate('applicant', 'firstName lastName email');

    // Notify Employer via Email (non-blocking)
    if (job.postedBy) {
      User.findById(job.postedBy).then(employer => {
        if (employer && employer.email) {
          sendEmail({
            to: employer.email,
            subject: `New Application: ${job.title}`,
            html: `
              <h3>Hello ${employer.firstName || 'Employer'},</h3>
              <p>You have received a new application for your job posting: <strong>${job.title}</strong>.</p>
              <p><strong>Applicant:</strong> ${application.applicant.firstName} ${application.applicant.lastName} (${application.applicant.email})</p>
              <p>Please log in to your <a href="http://localhost:5500/employer-dashboard.html">Employer Dashboard</a> to review their profile and cover letter.</p>
              <br/>
              <p>Best regards,<br/>The Look Nepal Team</p>
            `
          });
        }
      }).catch(err => console.error('Failed to look up employer for email notification:', err));
    }

    res.status(201).json({
      message: 'Application submitted successfully',
      application: application.getPublicInfo()
    });

  } catch (error) {
    console.error('Application submission error:', error);
    res.status(500).json({
      message: 'Server error submitting application',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/applications/my-applications
 * @desc    Get current user's job applications
 * @access  Private (Job seekers only)
 */
router.get('/my-applications', authenticate, authorize('job_seeker'), async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    let filters = { applicant: req.user._id };
    if (status) {
      filters.status = status;
    }

    const skip = (page - 1) * limit;

    const applications = await Application.find(filters)
      .populate('job', 'title company slug jobType category salary location status applicationDeadline')
      .populate({
        path: 'job',
        populate: {
          path: 'company',
          select: 'name logo slug'
        }
      })
      .sort({ appliedAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const totalApplications = await Application.countDocuments(filters);

    res.json({
      applications,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(totalApplications / limit),
        totalApplications
      }
    });

  } catch (error) {
    console.error('Error fetching user applications:', error);
    res.status(500).json({
      message: 'Server error fetching applications',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/applications/:id
 * @desc    Get specific application details
 * @access  Private (Application owner or job poster)
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('job', 'title company postedBy')
      .populate('applicant', 'firstName lastName email phone skills experience resume')
      .populate({
        path: 'job',
        populate: {
          path: 'company',
          select: 'name logo slug'
        }
      });

    if (!application) {
      return res.status(404).json({
        message: 'Application not found'
      });
    }

    // Check if user is authorized to view this application
    const isApplicant = application.applicant._id.toString() === req.user._id.toString();
    const isJobPoster = application.job.postedBy.toString() === req.user._id.toString();

    if (!isApplicant && !isJobPoster) {
      return res.status(403).json({
        message: 'You do not have permission to view this application'
      });
    }

    res.json({
      application: application.getPublicInfo()
    });

  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({
      message: 'Server error fetching application',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/applications/:id/status
 * @desc    Update application status
 * @access  Private (Job poster only)
 */
router.put('/:id/status', authenticate, authorize('employer'), [
  body('status').isIn(['pending', 'under review', 'shortlisted', 'rejected', 'accepted']).withMessage('Invalid application status'),
  body('note').optional().trim().isLength({ max: 1000 }).withMessage('Note must not exceed 1000 characters')
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

    const { status, note } = req.body;

    const application = await Application.findById(req.params.id)
      .populate('job', 'postedBy title');

    if (!application) {
      return res.status(404).json({
        message: 'Application not found'
      });
    }

    // Check if user posted the job
    if (application.job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'You can only update applications for your job postings'
      });
    }

    // Update application status
    application.status = status;

    // Add note if provided
    if (note) {
      application.notes.push({
        date: new Date(),
        note: note,
        addedBy: req.user._id
      });
    }

    await application.save();

    res.json({
      message: 'Application status updated successfully',
      application: {
        id: application._id,
        status: application.status,
        jobTitle: application.job.title
      }
    });

  } catch (error) {
    console.error('Application status update error:', error);
    res.status(500).json({
      message: 'Server error updating application status',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/applications/job/:jobId
 * @desc    Get all applications for a specific job
 * @access  Private (Job poster only)
 */
router.get('/job/:jobId', authenticate, authorize('employer'), async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    // Verify job exists and user owns it
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({
        message: 'Job not found'
      });
    }

    if (job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'You can only view applications for your own job postings'
      });
    }

    let filters = { job: req.params.jobId };
    if (status) {
      filters.status = status;
    }

    const skip = (page - 1) * limit;

    const applications = await Application.find(filters)
      .populate('applicant', 'firstName lastName email phone skills experience profilePicture')
      .sort({ appliedAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    const totalApplications = await Application.countDocuments(filters);

    // Get application status summary
    const statusCounts = await Application.aggregate([
      { $match: { job: job._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const statusSummary = {
      total: totalApplications,
      pending: 0,
      'under review': 0,
      shortlisted: 0,
      rejected: 0,
      accepted: 0
    };

    statusCounts.forEach(item => {
      statusSummary[item._id] = item.count;
    });

    res.json({
      applications,
      job: {
        id: job._id,
        title: job.title,
        status: job.status
      },
      statusSummary,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(totalApplications / limit),
        totalApplications
      }
    });

  } catch (error) {
    console.error('Error fetching job applications:', error);
    res.status(500).json({
      message: 'Server error fetching job applications',
      error: error.message
    });
  }
});

/**
 * @route   PUT /api/applications/:id/rating
 * @desc    Rate an applicant
 * @access  Private (Job poster only)
 */
router.put('/:id/rating', authenticate, authorize('employer'), [
  body('ratings.skills').optional().isFloat({ min: 0, max: 5 }).withMessage('Skills rating must be between 0 and 5'),
  body('ratings.cultureFit').optional().isFloat({ min: 0, max: 5 }).withMessage('Culture fit rating must be between 0 and 5'),
  body('ratings.experience').optional().isFloat({ min: 0, max: 5 }).withMessage('Experience rating must be between 0 and 5'),
  body('ratings.overall').optional().isFloat({ min: 0, max: 5 }).withMessage('Overall rating must be between 0 and 5')
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

    const { ratings } = req.body;

    const application = await Application.findById(req.params.id)
      .populate('job', 'postedBy title');

    if (!application) {
      return res.status(404).json({
        message: 'Application not found'
      });
    }

    // Check if user posted the job
    if (application.job.postedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'You can only rate applications for your job postings'
      });
    }

    // Update ratings
    if (ratings) {
      Object.keys(ratings).forEach(key => {
        if (application.ratings[key] !== undefined) {
          application.ratings[key] = ratings[key];
        }
      });
    }

    await application.save();

    res.json({
      message: 'Applicant rated successfully',
      ratings: application.ratings
    });

  } catch (error) {
    console.error('Application rating error:', error);
    res.status(500).json({
      message: 'Server error rating applicant',
      error: error.message
    });
  }
});

module.exports = router;
