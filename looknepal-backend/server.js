// server.js

// =================================================================
//                      1. REQUIRE STATEMENTS
// =================================================================
// All 'require' statements should be at the very top of the file.

require('dotenv').config(); // Loads environment variables from a .env file
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Handles Cross-Origin Resource Sharing
const http = require('http');
const { Server } = require('socket.io');

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

// Create HTTP Server and bind Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for dev
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

// Map to track active user socket connections
const activeUsers = new Map();

io.on('connection', (socket) => {
  console.log('New WebSocket client connected:', socket.id);

  socket.on('register', (userId) => {
    activeUsers.set(userId, socket.id);
    console.log(`User ${userId} registered with socket ${socket.id}`);
  });

  socket.on('disconnect', () => {
    console.log('WebSocket disconnected:', socket.id);
    for (let [userId, sockId] of activeUsers.entries()) {
      if (sockId === socket.id) {
        activeUsers.delete(userId);
        break;
      }
    }
  });
});

// Make io and activeUsers accessible in routes
app.set('io', io);
app.set('activeUsers', activeUsers);

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
  .then(() => {
    console.log('MongoDB connected successfully.');
    // Initialize scheduled cron tasks
    const { initCronJobs } = require('./utils/cronJobs');
    initCronJobs();
  })
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

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});