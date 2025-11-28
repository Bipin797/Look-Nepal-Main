// models/Application.js
const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  applicant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  coverLetter: {
    type: String,
    maxlength: 2000
  },
  resume: {
    filename: String,
    originalName: String,
    path: String,
    uploadDate: Date
  },
  status: {
    type: String,
    enum: ['pending', 'under review', 'shortlisted', 'rejected', 'accepted'],
    default: 'pending'
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  notes: [{
    date: Date,
    note: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  ratings: {
    skills: {
      type: Number,
      min: 0,
      max: 5
    },
    cultureFit: {
      type: Number,
      min: 0,
      max: 5
    },
    experience: {
      type: Number,
      min: 0,
      max: 5
    },
    overall: {
      type: Number,
      min: 0,
      max: 5
    }
  }
}, {
  timestamps: true
});

// Indexes
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });
applicationSchema.index({ status: 1 });
applicationSchema.index({ appliedAt: -1 });

// Instance method to get public application info
applicationSchema.methods.getPublicInfo = function() {
  return {
    id: this._id,
    job: this.job,
    applicant: this.applicant,
    coverLetter: this.coverLetter,
    resume: this.resume,
    status: this.status,
    appliedAt: this.appliedAt,
    ratings: this.ratings,
    notesCount: this.notes.length
  };
};

const Application = mongoose.model('Application', applicationSchema);

module.exports = Application;

