// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Information
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      return !this.socialLogin;
    },
    minlength: 6
  },
  phone: {
    type: String,
    trim: true
  },
  
  // User Type and Status
  userType: {
    type: String,
    enum: ['job_seeker', 'employer', 'admin'],
    required: true,
    default: 'job_seeker'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Social Login Information
  socialLogin: {
    google: {
      id: String,
      email: String
    },
    facebook: {
      id: String,
      email: String
    }
  },
  
  // Profile Information
  profilePicture: {
    type: String,
    default: ''
  },
  location: {
    city: String,
    state: String,
    country: {
      type: String,
      default: 'Nepal'
    }
  },
  
  // Job Seeker Specific Fields
  resume: {
    filename: String,
    originalName: String,
    path: String,
    uploadDate: Date
  },
  skills: [{
    type: String,
    trim: true
  }],
  experience: {
    type: String,
    enum: ['entry', 'mid', 'senior', 'executive'],
    default: 'entry'
  },
  expectedSalary: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'NPR'
    }
  },
  
  // Employer Specific Fields
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  
  // Preferences
  jobPreferences: {
    jobTypes: [{
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'internship', 'remote']
    }],
    categories: [{
      type: String
    }],
    locations: [{
      type: String
    }]
  },
  
  // Activity Tracking
  lastLogin: {
    type: Date
  },
  profileViews: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ userType: 1 });
userSchema.index({ 'socialLogin.google.id': 1 });
userSchema.index({ 'socialLogin.facebook.id': 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const hashedPassword = await bcrypt.hash(this.password, 12);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to get public profile
userSchema.methods.getPublicProfile = function() {
  return {
    id: this._id,
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,
    userType: this.userType,
    profilePicture: this.profilePicture,
    location: this.location,
    skills: this.skills,
    experience: this.experience,
    profileViews: this.profileViews,
    createdAt: this.createdAt
  };
};

// Static method to find by social login
userSchema.statics.findBySocialLogin = function(provider, socialId) {
  const query = {};
  query[`socialLogin.${provider}.id`] = socialId;
  return this.findOne(query);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
