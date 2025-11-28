// js/main.js - Main JavaScript for LookNepal Job Platform

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';
let authToken = localStorage.getItem('authToken');
let currentUser = null;

// DOM Elements
const searchInput = document.querySelector('.text-search input');
const searchButton = document.querySelector('.search-button');
const jobCards = document.getElementById('jobListContainer');
const signInLink = document.querySelector('a[href="signIn.html"]');
const employerLink = document.querySelector('a[href=""]'); // Employers / Post Jobs

// Authentication state management
function updateNavigation() {
  if (currentUser) {
    signInLink.textContent = `Hi, ${currentUser.firstName}`;
    signInLink.href = '#';
    signInLink.onclick = showUserMenu;

    if (currentUser.userType === 'employer') {
      employerLink.textContent = 'Post Job';
      employerLink.href = 'post-job.html';
    } else {
      employerLink.textContent = 'My Applications';
      employerLink.href = 'my-applications.html';
    }
  }
}

function showUserMenu(e) {
  e.preventDefault();
  // Simple dropdown menu (can be enhanced with Bootstrap dropdown)
  const menu = document.createElement('div');
  menu.className = 'user-menu position-absolute bg-white border rounded shadow p-2';
  menu.style.top = '100%';
  menu.style.right = '0';
  menu.style.zIndex = '1000';

  menu.innerHTML = `
    <div><a href="#" onclick="showProfile()">Profile</a></div>
    <div><a href="#" onclick="logout()">Logout</a></div>
  `;

  signInLink.parentElement.style.position = 'relative';
  signInLink.parentElement.appendChild(menu);

  // Remove menu when clicking elsewhere
  setTimeout(() => {
    document.addEventListener('click', function removeMenu() {
      menu.remove();
      document.removeEventListener('click', removeMenu);
    });
  }, 100);
}

function logout() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  authToken = null;
  currentUser = null;
  location.reload();
}

// API Functions
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (authToken) {
    defaultOptions.headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API call failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Job search functionality
async function searchJobs(query = '', filters = {}) {
  try {
    showLoadingState();

    const params = new URLSearchParams();
    if (query) params.append('search', query);
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });

    const data = await apiCall(`/jobs?${params.toString()}`);
    displayJobs(data.jobs);
    updatePagination(data.pagination);
  } catch (error) {
    showError('Failed to search jobs. Please try again.');
  }
}

function displayJobs(jobs) {
  if (!jobs || jobs.length === 0) {
    jobCards.innerHTML = `
      <div class="text-center py-5">
        <h4>No jobs found</h4>
        <p>Try adjusting your search criteria</p>
      </div>
    `;
    return;
  }

  jobCards.innerHTML = jobs.map(job => createJobCard(job)).join('');
}

function createJobCard(job) {
  const salary = job.salary ?
    `Rs.${job.salary.min.toLocaleString()} - Rs.${job.salary.max.toLocaleString()} a month` :
    'Salary not specified';

  const company = job.company || {};
  const location = job.location ? `${job.location.city}, ${job.location.country}` : 'Location not specified';
  const postedDate = new Date(job.createdAt).toLocaleDateString();
  const daysAgo = Math.floor((new Date() - new Date(job.createdAt)) / (1000 * 60 * 60 * 24));

  return `
    <div class="card mb-3" onclick="viewJobDetails('${job._id}')">
      <div class="card-body">
        <h5 class="card-title">${job.title}</h5>
        <p class="card-company">${company.name || 'Company Name'} ${company.rating ? company.rating.overall : ''}</p>
        <div class="job-feature-box">
          <p class="feature-salary">${salary}</p>
        </div>
        <div class="job-feature-box">
          <p class="feature-type">${job.jobType || 'Full-time'}</p>
        </div>
        <div class="job-feature-box">
          <p class="feature-type">${job.experienceLevel || 'All levels'}</p>
        </div>
        <ul>
          <li>${location}</li>
          <li>${job.category || 'General'}</li>
          ${job.location && job.location.isRemote ? '<li>Remote</li>' : ''}
        </ul>
        <p class="card-text">Posted ${daysAgo} days ago</p>
      </div>
    </div>
  `;
}

function viewJobDetails(jobId) {
  window.location.href = `job-details.html?id=${jobId}`;
}

function showLoadingState() {
  jobCards.innerHTML = `
    <div class="text-center py-5">
      <div class="spinner-border" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p>Searching for jobs...</p>
    </div>
  `;
}

function showError(message) {
  jobCards.innerHTML = `
    <div class="alert alert-danger text-center" role="alert">
      ${message}
    </div>
  `;
}

function updatePagination(pagination) {
  // TODO: Implement pagination UI
  console.log('Pagination:', pagination);
}

// Event listeners
document.addEventListener('DOMContentLoaded', async function () {
  // Check for existing authentication
  const storedUser = localStorage.getItem('currentUser');
  if (authToken && storedUser) {
    try {
      currentUser = JSON.parse(storedUser);
      updateNavigation();
    } catch (error) {
      console.error('Error parsing stored user:', error);
      logout();
    }
  }

  // Load initial jobs
  await searchJobs();

  // Search functionality
  if (searchButton) {
    searchButton.addEventListener('click', handleSearch);
  }

  if (searchInput) {
    searchInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        handleSearch();
      }
    });
  }
});

function handleSearch() {
  const query = searchInput?.value.trim() || '';
  searchJobs(query);
}

// Utility functions
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

function formatSalary(min, max, currency = 'NPR') {
  if (!min && !max) return 'Salary not specified';
  if (min && max) return `${currency} ${min.toLocaleString()} - ${max.toLocaleString()}`;
  if (min) return `From ${currency} ${min.toLocaleString()}`;
  if (max) return `Up to ${currency} ${max.toLocaleString()}`;
}

// Global functions for use in other pages
window.LookNepal = {
  apiCall,
  searchJobs,
  logout,
  authToken: () => authToken,
  currentUser: () => currentUser,
  setAuthToken: (token) => {
    authToken = token;
    localStorage.setItem('authToken', token);
  },
  setCurrentUser: (user) => {
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));
    updateNavigation();
  }
};
