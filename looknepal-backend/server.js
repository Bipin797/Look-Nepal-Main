// server.js

// =================================================================
//                      1. REQUIRE STATEMENTS
// =================================================================
// All 'require' statements should be at the very top of the file.

require('dotenv').config(); // Loads environment variables from a .env file
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // Handles Cross-Origin Resource Sharing
const Post = require('./models/postModels'); // Imports the Mongoose model for Posts

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

/**
 * @route   POST /api/posts
 * @desc    Create a new post
 * @access  Public
 */
app.post('/api/posts', async (req, res) => {
  try {
    // Create a new post instance using the data from the request body
    const newPost = new Post({
      title: req.body.title,
      content: req.body.content,
      author: req.body.author,
    });

    // Save the new post to the database
    const savedPost = await newPost.save();

    // Respond with a 201 (Created) status and the saved post data
    res.status(201).json(savedPost);
  } catch (error) {
    // If an error occurs, log it to the console for debugging
    console.error("Error in POST /api/posts:", error);
    // Respond with a 500 (Internal Server Error) status and an error message
    res.status(500).json({ message: 'Error creating post', error: error.message });
  }
});

/**
 * @route   GET /api/posts
 * @desc    Get all posts
 * @access  Public
 */
app.get('/api/posts', async (req, res) => {
  try {
    // Find all documents in the 'posts' collection
    const posts = await Post.find().sort({ createdAt: -1 }); // Sort by newest first
    
    // Respond with a 200 (OK) status and the array of posts
    res.status(200).json(posts);
  } catch (error) {
    // If an error occurs, log it to the console for debugging
    console.error("Error in GET /api/posts:", error);
    // Respond with a 500 (Internal Server Error) status and an error message
    res.status(500).json({ message: 'Error fetching posts', error: error.message });
  }
});

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