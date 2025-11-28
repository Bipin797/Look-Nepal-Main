// models/Job.js
const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  // Basic Job Information
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 5000
  },
  requirements: {
    type: String,
    required: true,
    maxlength: 3000
  },
  responsibilities: {
    type: String,
    maxlength: 3000
  },
  
  // Job Details
  jobType: {
    type: String,
    required: true,
    enum: ['full-time', 'part-time', 'contract', 'internship', 'remote', 'freelance']
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Technology',
      'Marketing',
      'Sales',
      'Finance',
      'Human Resources',
      'Operations',
      'Customer Service',
      'Design',
      'Healthcare',
      'Education',
      'Engineering',
      'Legal',
      'Other'
    ]
  },
  experienceLevel: {
    type: String,
    required: true,
    enum: ['entry', 'mid', 'senior', 'executive']
  },
  
  // Salary Information
  salary: {
    min: {
      type: Number,
      required: true
    },
    max: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'NPR'
    },
    period: {
      type: String,
      enum: ['hourly', 'daily', 'monthly', 'yearly'],
      default: 'monthly'
    },
    negotiable: {
      type: Boolean,
      default: false
    }
  },
  
  // Location
  location: {
    city: {
      type: String,
      required: true
    },
    state: String,
    country: {
      type: String,
      default: 'Nepal'
    },
    isRemote: {
      type: Boolean,
      default: false
    },
    remoteType: {
      type: String,
      enum: ['fully-remote', 'hybrid', 'occasional'],
      default: null
    }
  },
  
  // Company Information
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Skills and Qualifications
  requiredSkills: [{
    type: String,
    trim: true
  }],
  preferredSkills: [{
    type: String,
    trim: true
  }],
  education: {
    level: {
      type: String,
      enum: ['high-school', 'diploma', 'bachelors', 'masters', 'phd', 'any']
    },
    field: String
  },
  
  // Benefits and Perks
  benefits: [{
    type: String,
    trim: true
  }],
  
  // Application Details
  applicationDeadline: {
    type: Date,
    required: true
  },
  applicationMethod: {
    type: String,
    enum: ['platform', 'email', 'external'],
    default: 'platform'
  },
  externalApplicationUrl: String,
  applicationEmail: String,
  
  // Job Status
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'closed', 'expired'],
    default: 'active'
  },
  isUrgent: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  // Statistics
  stats: {
    views: {
      type: Number,
      default: 0
    },
    applications: {
      type: Number,
      default: 0
    },
    saves: {
      type: Number,
      default: 0
    }
  },
  
  // SEO and Search
  tags: [{
    type: String,
    trim: true
  }],
  
  // Premium Features
  boost: {
    isActive: {
      type: Boolean,
      default: false
    },
    expiresAt: Date
  }
}, {
  timestamps: true
});

// Indexes for better search performance
jobSchema.index({ title: 'text', description: 'text', requirements: 'text' });
jobSchema.index({ category: 1 });
jobSchema.index({ jobType: 1 });
jobSchema.index({ experienceLevel: 1 });
jobSchema.index({ 'location.city': 1 });
jobSchema.index({ company: 1 });
jobSchema.index({ postedBy: 1 });
jobSchema.index({ status: 1 });
jobSchema.index({ createdAt: -1 });
jobSchema.index({ applicationDeadline: 1 });
jobSchema.index({ 'salary.min': 1, 'salary.max': 1 });

// Compound indexes for common queries
jobSchema.index({ status: 1, category: 1 });
jobSchema.index({ status: 1, 'location.city': 1 });
jobSchema.index({ status: 1, jobType: 1 });

// Pre-save middleware to generate slug
jobSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') + '-' + randomSuffix;
  }
  next();
});

// Pre-save middleware to check application deadline
jobSchema.pre('save', function(next) {
  if (this.applicationDeadline < new Date() && this.status === 'active') {
    this.status = 'expired';
  }
  next();
});

// Instance method to check if job is expired
jobSchema.methods.isExpired = function() {
  return this.applicationDeadline < new Date();
};

// Instance method to get public job info
jobSchema.methods.getPublicInfo = function() {
  return {
    id: this._id,
    title: this.title,
    slug: this.slug,
    description: this.description,
    requirements: this.requirements,
    responsibilities: this.responsibilities,
    jobType: this.jobType,
    category: this.category,
    experienceLevel: this.experienceLevel,
    salary: this.salary,
    location: this.location,
    requiredSkills: this.requiredSkills,
    preferredSkills: this.preferredSkills,
    education: this.education,
    benefits: this.benefits,
    applicationDeadline: this.applicationDeadline,
    applicationMethod: this.applicationMethod,
    externalApplicationUrl: this.externalApplicationUrl,
    status: this.status,
    isUrgent: this.isUrgent,
    isFeatured: this.isFeatured,
    stats: this.stats,
    tags: this.tags,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

// Static method to find active jobs
jobSchema.statics.findActiveJobs = function(filters = {}) {
  return this.find({ 
    status: 'active', 
    applicationDeadline: { $gte: new Date() },
    ...filters 
  }).populate('company', 'name logo slug industry address rating');
};

// Static method to search jobs
jobSchema.statics.searchJobs = function(query, filters = {}) {
  const searchFilter = {
    status: 'active',
    applicationDeadline: { $gte: new Date() },
    ...filters
  };

  if (query) {
    searchFilter.$text = { $search: query };
  }

  return this.find(searchFilter)
    .populate('company', 'name logo slug industry address rating')
    .sort({ createdAt: -1 });
};

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;
