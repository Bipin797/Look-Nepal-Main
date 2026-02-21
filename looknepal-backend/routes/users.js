// routes/users.js
const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   PUT /api/users/onboarding
 * @desc    Save wizard setup preferences and set onboardingCompleted to true
 * @access  Private
 */
router.put('/onboarding', authenticate, [
    body('location.city').optional().isString().trim(),
    body('location.state').optional().isString().trim(),
    body('location.country').optional().isString().trim(),
    body('expectedSalary').optional().isNumeric(),
    body('desiredJobTitles').optional().isArray(),
    body('isRemote').optional().isBoolean(),
    body('profileVisibility').optional().isIn(['public', 'private'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ message: 'Validation failed', errors: errors.array() });
        }

        const { location, expectedSalary, desiredJobTitles, isRemote, profileVisibility } = req.body;

        // Find user
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Update location directly
        if (location) {
            if (location.city) user.location.city = location.city;
            if (location.state) user.location.state = location.state;
            if (location.country) user.location.country = location.country;
        }

        // Initialize or update preferences subset
        if (!user.preferences) user.preferences = {};
        if (expectedSalary !== undefined) user.preferences.expectedSalary = expectedSalary;
        if (desiredJobTitles !== undefined) user.preferences.desiredJobTitles = desiredJobTitles;
        if (isRemote !== undefined) user.preferences.isRemote = isRemote;
        if (profileVisibility !== undefined) user.preferences.profileVisibility = profileVisibility;

        // Finally mark onboarding as completed
        user.onboardingCompleted = true;

        await user.save();

        res.json({
            message: 'Onboarding completed successfully',
            user: user.getPublicProfile()
        });

    } catch (error) {
        console.error('Onboarding update error:', error);
        res.status(500).json({
            message: 'Server error updating onboarding preferences',
            error: error.message
        });
    }
});
/**
 * @route   POST /api/users/saved-jobs/:jobId
 * @desc    Toggle saving/unsaving a job
 * @access  Private (Job Seeker)
 */
router.post('/saved-jobs/:jobId', authenticate, async (req, res) => {
    try {
        if (req.user.userType !== 'job_seeker') {
            return res.status(403).json({ message: 'Only job seekers can save jobs' });
        }

        const jobId = req.params.jobId;
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Initialize array if it doesn't exist
        if (!user.savedJobs) {
            user.savedJobs = [];
        }

        const jobIndex = user.savedJobs.indexOf(jobId);
        let action = '';

        if (jobIndex > -1) {
            // Unsave
            user.savedJobs.splice(jobIndex, 1);
            action = 'unsaved';
        } else {
            // Save
            user.savedJobs.push(jobId);
            action = 'saved';
        }

        await user.save();

        res.json({
            message: `Job successfully ${action}`,
            savedJobs: user.savedJobs
        });

    } catch (error) {
        console.error('Save job error:', error);
        res.status(500).json({ message: 'Server error toggling saved job' });
    }
});

/**
 * @route   GET /api/users/saved-jobs
 * @desc    Get user's saved jobs
 * @access  Private (Job Seeker)
 */
router.get('/saved-jobs', authenticate, async (req, res) => {
    try {
        if (req.user.userType !== 'job_seeker') {
            return res.status(403).json({ message: 'Only job seekers can view saved jobs' });
        }

        const user = await User.findById(req.user._id)
            .populate({
                path: 'savedJobs',
                match: { status: 'active' }, // Optional: only return jobs that are still active
                populate: {
                    path: 'company',
                    select: 'name logo'
                }
            })
            .lean();

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            savedJobs: user.savedJobs || []
        });

    } catch (error) {
        console.error('Fetch saved jobs error:', error);
        res.status(500).json({ message: 'Server error fetching saved jobs' });
    }
});
module.exports = router;
