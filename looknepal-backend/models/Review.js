// models/Review.js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
        required: true
    },
    reviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rating: {
        overall: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        workLifeBalance: {
            type: Number,
            min: 1,
            max: 5
        },
        culture: {
            type: Number,
            min: 1,
            max: 5
        },
        careerOpportunities: {
            type: Number,
            min: 1,
            max: 5
        },
        compensation: {
            type: Number,
            min: 1,
            max: 5
        },
        management: {
            type: Number,
            min: 1,
            max: 5
        }
    },
    title: {
        type: String,
        required: true,
        maxlength: 100
    },
    pros: {
        type: String,
        required: true,
        maxlength: 1000
    },
    cons: {
        type: String,
        required: true,
        maxlength: 1000
    },
    advice: {
        type: String,
        maxlength: 500
    },
    jobTitle: {
        type: String,
        required: true
    },
    employmentStatus: {
        type: String,
        enum: ['current', 'former'],
        required: true
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    helpful: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Indexes
reviewSchema.index({ company: 1, createdAt: -1 });
reviewSchema.index({ reviewer: 1 });

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
