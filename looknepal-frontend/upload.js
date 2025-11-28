// middleware/upload.js
const multer = require('multer');
const path = require('path');

// Configure storage for resumes
const resumeStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/resumes/');
  },
  filename: function (req, file, cb) {
    const userId = req.user ? req.user._id : 'anonymous';
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    cb(null, `resume_${userId}_${timestamp}${extension}`);
  }
});

// Configure storage for company logos
const logoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/logos/');
  },
  filename: function (req, file, cb) {
    const companyId = req.params.companyId || 'temp';
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    cb(null, `logo_${companyId}_${timestamp}${extension}`);
  }
});

// File filter for resumes (PDF, DOC, DOCX)
const resumeFileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, DOC, and DOCX files are allowed for resumes.'), false);
  }
};

// File filter for logos (images)
const logoFileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed for logos.'), false);
  }
};

// Resume upload middleware
const uploadResume = multer({
  storage: resumeStorage,
  fileFilter: resumeFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
}).single('resume');

// Logo upload middleware
const uploadLogo = multer({
  storage: logoStorage,
  fileFilter: logoFileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  }
}).single('logo');

// Error handling middleware
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: 'File too large',
        error: 'File size exceeds the allowed limit'
      });
    }
    return res.status(400).json({
      message: 'Upload error',
      error: err.message
    });
  }
  
  if (err) {
    return res.status(400).json({
      message: 'Upload failed',
      error: err.message
    });
  }
  
  next();
};

module.exports = {
  uploadResume,
  uploadLogo,
  handleUploadError
};
