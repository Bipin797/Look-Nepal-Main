// models/Company.js
const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  // Basic Company Information
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  
  // Contact Information
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  
  // Location
  address: {
    street: String,
    city: {
      type: String,
      required: true
    },
    state: String,
    country: {
      type: String,
      default: 'Nepal'
    },
    postalCode: String
  },
  
  // Company Details
  industry: {
    type: String,
    required: true,
    enum: [
      'Technology',
      'Finance',
      'Healthcare',
      'Education',
      'Manufacturing',
      'Construction',
      'Retail',
      'Hospitality',
      'Transportation',
      'Government',
      'Non-profit',
      'Other'
    ]
  },
  companySize: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'],
    required: true
  },
  foundedYear: {
    type: Number,
    min: 1800,
    max: new Date().getFullYear()
  },
  
  // Media
  logo: {
    type: String,
    default: ''
  },
  coverImage: {
    type: String,
    default: ''
  },
  gallery: [{
    type: String
  }],
  
  // Social Media
  socialMedia: {
    linkedin: String,
    facebook: String,
    twitter: String,
    instagram: String
  },
  
  // Company Culture & Benefits
  benefits: [{
    type: String,
    trim: true
  }],
  compulyCulture: {
    type: String,
    maxlength: 1000
  },
  
  // Verification & Status
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPremium: {
    type: Boolean,
    default: false
  },
  
  // Ratings & Reviews
  rating: {
    overall: {
      type: Number,
      default: 0
    },
    workLifeBalance: {
      type: Number,
      default: 0
    },
    culture: {
      type: Number,
      default: 0
    },
    careerOpportunities: {
      type: Number,
      default: 0
    },
    compensation: {
      type: Number,
      default: 0
    },
    management: {
      type: Number,
      default: 0
    },
    totalReviews: {
      type: Number,
      default: 0
    }
  },
  
  // Owner/Admin
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Job Statistics
  stats: {
    totalJobs: {
      type: Number,
      default: 0
    },
    activeJobs: {
      type: Number,
      default: 0
    },
    totalApplications: {
      type: Number,
      default: 0
    },
    profileViews: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Indexes
companySchema.index({ name: 1 });
companySchema.index({ slug: 1 });
companySchema.index({ industry: 1 });
companySchema.index({ 'address.city': 1 });
companySchema.index({ owner: 1 });
companySchema.index({ isActive: 1, isVerified: 1 });

// Pre-save middleware to generate slug
companySchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

// Instance method to get public profile
companySchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    name: this.name,
    slug: this.slug,
    description: this.description,
    logo: this.logo,
    coverImage: this.coverImage,
    industry: this.industry,
    companySize: this.companySize,
    foundedYear: this.foundedYear,
    address: this.address,
    website: this.website,
    socialMedia: this.socialMedia,
    benefits: this.benefits,
    compulyCulture: this.compulyCulture,
    rating: this.rating,
    isVerified: this.isVerified,
    isPremium: this.isPremium,
    stats: this.stats,
    createdAt: this.createdAt
  };
};

// Static method to find by slug
companySchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug: slug, isActive: true });
};

const Company = mongoose.model('Company', companySchema);

module.exports = Company;
