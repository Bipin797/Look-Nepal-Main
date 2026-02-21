// routes/admin.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

/**
 * @route   GET /api/admin/stats
 * @desc    Get dashboard statistics
 * @access  Private/Admin
 */
router.get('/stats', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalEmployers = await User.countDocuments({ userType: 'employer' });
        const totalJobSeekers = await User.countDocuments({ userType: 'job_seeker' });

        const totalJobs = await Job.countDocuments();
        const activeJobs = await Job.countDocuments({ status: 'active' });

        const totalApplications = await Application.countDocuments();

        res.json({
            users: {
                total: totalUsers,
                employers: totalEmployers,
                jobSeekers: totalJobSeekers
            },
            jobs: {
                total: totalJobs,
                active: activeJobs
            },
            applications: {
                total: totalApplications
            }
        });
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   GET /api/admin/users
 * @desc    Get all users (with optional filtering)
 * @access  Private/Admin
 */
router.get('/users', async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ _id: -1 });
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   PUT /api/admin/users/:id/status
 * @desc    Toggle user active status
 * @access  Private/Admin
 */
router.put('/users/:id/status', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Prevent admin from deactivating themselves
        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'Cannot deactivate your own account' });
        }

        user.isActive = !user.isActive;
        await user.save();

        res.json({
            message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
            user: {
                id: user._id,
                isActive: user.isActive
            }
        });
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user
 * @access  Private/Admin
 */
router.delete('/users/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user._id.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }

        // In a real app, you might want to mark as deleted rather than actually deleting,
        // or you'd need to delete associated jobs/applications.
        // For simplicity, we just delete the user document here.
        await User.findByIdAndDelete(req.params.id);

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   GET /api/admin/jobs
 * @desc    Get all jobs
 * @access  Private/Admin
 */
router.get('/jobs', async (req, res) => {
    try {
        const jobs = await Job.find().populate('employer', 'firstName lastName email').sort({ postedAt: -1 });
        res.json(jobs);
    } catch (error) {
        console.error('Error fetching jobs:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

/**
 * @route   DELETE /api/admin/jobs/:id
 * @desc    Delete job
 * @access  Private/Admin
 */
router.delete('/jobs/:id', async (req, res) => {
    try {
        const job = await Job.findByIdAndDelete(req.params.id);
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }
        res.json({ message: 'Job deleted successfully' });
    } catch (error) {
        console.error('Error deleting job:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
