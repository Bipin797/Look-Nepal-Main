// script.js

// The URL of your backend's API endpoint
const API_URL = 'http://localhost:3000/api/posts';

// Get references to DOM elements
const postsContainer = document.getElementById('posts-container');
const loadingIndicator = document.getElementById('loading');
const createPostForm = document.getElementById('create-post-form'); // Reference to the new form

// =======================================================
//                  NEW CREATE POST FUNCTION
// =======================================================
/**
 * Handles the form submission to create a new post.
 * @param {Event} event - The form submission event
 */
async function createPost(event) {
  // Prevent the default form submission which reloads the page
  event.preventDefault();

  // Get the data from the form inputs
  const postData = {
    title: document.getElementById('title').value,
    author: document.getElementById('author').value,
    content: document.getElementById('content').value,
  };

  try {
    // Send the data to the backend using a POST request
    const response = await fetch(API_URL, {
      method: 'POST', // Specify the HTTP method
      headers: {
        'Content-Type': 'application/json', // Tell the server we're sending JSON
      },
      body: JSON.stringify(postData), // Convert the JS object to a JSON string
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Clear the form fields after successful submission
    createPostForm.reset();

    // Refresh the list of posts to show the new one immediately
    fetchPosts();

  } catch (error) {
    console.error('Error creating post:', error);
    alert('Failed to create post. Please try again.');
  }
}

// Attach the createPost function to the form's submit event
createPostForm.addEventListener('submit', createPost);
// =======================================================
//                  END OF NEW SECTION
// =======================================================


/**
 * Fetches all posts from the backend API.
 */
async function fetchPosts() {
  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const posts = await response.json();
    displayPosts(posts);

  } catch (error) {
    console.error("Could not fetch posts:", error);
    postsContainer.innerHTML = '<p style="color: red;">Failed to load posts. Is the backend server running?</p>';
  }
}

/**
 * Renders an array of post objects to the DOM.
 * @param {Array} posts - An array of post objects from the API
 */
function displayPosts(posts) {
  postsContainer.innerHTML = '';

  if (posts.length === 0) {
    postsContainer.innerHTML = '<p>No posts found. Create one using the form above!</p>';
    return;
  }

  posts.forEach(post => {
    const postElement = document.createElement('div');
    postElement.classList.add('post');
    const postDate = new Date(post.createdAt).toLocaleDateString();
    postElement.innerHTML = `
      <h2>${post.title}</h2>
      <p>${post.content}</p>
      <small>By: ${post.author} on ${postDate}</small>
    `;
    postsContainer.appendChild(postElement);
  });
}

// Initial fetch of posts when the page loads
fetchPosts();