// server.js

// =================================================================
//                      1. REQUIRE STATEMENTS
// =================================================================
// All 'require' statements should be at the very top of the file.

require('dotenv').config(); // Loads environment variables from a .env file
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Handles Cross-Origin Resource Sharing

// Import Models
const User = require('./models/User');
const Company = require('./models/Company');
const Job = require('./models/Job');
const Application = require('./models/Application');

// Import Routes
const authRoutes = require('./routes/auth');
const jobRoutes = require('./routes/jobs');
const companyRoutes = require('./routes/companies');
const applicationRoutes = require('./routes/applications');
const adminRoutes = require('./routes/admin');

// =================================================================
//                      2. APP CONFIGURATION
// =================================================================
// Create the Express app and define the port.

const app = express();
const PORT = process.env.PORT || 3000;

// =================================================================
//                      3. MIDDLEWARE
// =================================================================
// Middleware must be defined BEFORE any routes to ensure they
// are applied to all incoming requests correctly.

// Enable CORS for all routes, allowing your frontend to connect.
app.use(cors());

// Enable Express to parse JSON in the request body. This is crucial
// for POST and PUT requests.
app.use(express.json());

// Serve static files for uploads
app.use('/uploads', express.static('uploads'));

// =================================================================
//                      4. DATABASE CONNECTION
// =================================================================
// Connect to the MongoDB Atlas cluster.

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully.'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit the process with an error code if DB connection fails
  });

// =================================================================
//                      5. API ROUTES
// =================================================================
// These are the endpoints your frontend will interact with.

// Route modules
app.use('/api/auth', authRoutes);
app.use('/api/users', require('./routes/users'));
app.use('/api/jobs', jobRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', require('./routes/messages'));

/**
 * @route   GET /
 * @desc    Root endpoint for basic server health check
 * @access  Public
 */
app.get('/', (req, res) => {
  res.send('Hello from the LookNepal backend! The server is running.');
});


// =================================================================
//                      6. START SERVER
// =================================================================
// This must be the last part of the file. It starts the server
// and makes it listen for incoming requests on the specified port.

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});