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
  const signInBtn = document.getElementById('navSignIn') || document.querySelector('a[href="signIn.html"]');
  const navContainer = signInBtn ? signInBtn.parentElement : document.querySelector('.auth-nav-container');

  if (currentUser && navContainer) {
    navContainer.className = 'd-flex align-items-center gap-4 auth-nav-container';

    // Define the employer link behavior
    const isEmployer = currentUser.userType === 'employer';
    const employerLinkText = isEmployer ? 'Employer Dashboard' : 'Employers / Post Job';
    const employerLinkHref = isEmployer ? 'employer-dashboard.html' : 'post-job.html'; // Or redirect job seekers to an employer landing page

    navContainer.innerHTML = `
      <div class="d-flex align-items-center gap-4">
        <a href="saved-jobs.html" class="text-dark" title="Saved Jobs"><i class="fa-solid fa-bookmark fs-5"></i></a>
        
        <div class="dropdown">
          <a href="#" class="text-dark" data-bs-toggle="dropdown" aria-expanded="false" title="Messages">
            <i class="fa-solid fa-message fs-5"></i>
          </a>
          <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0 rounded-3 p-3 text-center mt-2" style="width: 280px;">
            <li class="mb-2"><i class="fa-solid fa-envelope-open-text fs-2 text-muted opacity-50 mt-2"></i></li>
            <li><h6 class="mb-1 fw-bold">Welcome to Messages</h6></li>
            <li><small class="text-muted text-wrap">When employers contact you, you will see their messages here.</small></li>
            <hr class="my-2">
            <li><a href="messages.html" class="btn btn-sm btn-outline-primary w-100 rounded-pill">View all messages</a></li>
          </ul>
        </div>

        <div class="dropdown">
          <a href="#" class="text-dark position-relative" data-bs-toggle="dropdown" aria-expanded="false" title="Notifications">
            <i class="fa-solid fa-bell fs-5"></i>
            <span class="position-absolute p-1 bg-danger border border-light rounded-circle" style="top: 0px; right: 0px;">
              <span class="visually-hidden">New alerts</span>
            </span>
          </a>
          <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0 rounded-3 p-3 text-center mt-2" style="width: 280px;">
            <li class="mb-2"><i class="fa-solid fa-bell-slash fs-2 text-muted opacity-50 mt-2"></i></li>
            <li><h6 class="mb-1 fw-bold">Nothing right now</h6></li>
            <li><small class="text-muted text-wrap">Check back later for new alerts and custom job recommendations.</small></li>
          </ul>
        </div>

        <a href="#" id="profileMenuToggle" class="text-dark position-relative" title="Profile"><i class="fa-solid fa-user fs-5"></i></a>
      </div>
      <div class="vrt-line border-start border-1 border-secondary" style="height: 24px; opacity: 0.3;"></div>
      <a href="${employerLinkHref}" class="text-dark text-decoration-none fw-semibold" style="white-space: nowrap;">${employerLinkText}</a>
    `;

    // Attach dropdown menu logic
    const profileToggle = document.getElementById('profileMenuToggle');
    if (profileToggle) {
      profileToggle.onclick = showUserMenu;
    }
  }
}

function showUserMenu(e) {
  e.preventDefault();

  // Remove existing menu if clicked again
  const existingMenu = document.querySelector('.user-menu');
  if (existingMenu) {
    existingMenu.remove();
    return;
  }

  // Enhanced SaaS-style dropdown menu
  const menu = document.createElement('div');
  menu.className = 'user-menu';

  // Extract user details (fallback gracefully)
  const userName = currentUser.firstName
    ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim()
    : (currentUser.name || 'User');
  const userEmail = currentUser.email || 'Signed in';

  const headerHTML = `
    <div class="user-menu-header">
      <span class="user-menu-header-name">${userName}</span>
      <span class="user-menu-header-email">${userEmail}</span>
    </div>
  `;

  if (currentUser.userType === 'employer') {
    menu.innerHTML = headerHTML + `
      <div class="user-menu-body">
        <a href="employer-dashboard.html"><i class="fa-solid fa-gauge-high"></i> Dashboard</a>
        <a href="profile.html"><i class="fa-solid fa-building-user"></i> Employer Profile</a>
        <a href="post-job.html"><i class="fa-solid fa-briefcase"></i> Post a Job</a>
        <div class="user-menu-divider"></div>
        <a href="#" onclick="logout()" class="text-danger"><i class="fa-solid fa-right-from-bracket text-danger"></i> Sign out</a>
      </div>
    `;
  } else if (currentUser.userType === 'admin') {
    menu.innerHTML = headerHTML + `
      <div class="user-menu-body">
        <a href="admin-dashboard.html"><i class="fa-solid fa-screwdriver-wrench"></i> Admin Dashboard</a>
        <a href="profile.html"><i class="fa-regular fa-user"></i> My Profile</a>
        <div class="user-menu-divider"></div>
        <a href="#" onclick="logout()" class="text-danger"><i class="fa-solid fa-right-from-bracket text-danger"></i> Sign out</a>
      </div>
    `;
  } else {
    menu.innerHTML = headerHTML + `
      <div class="user-menu-body">
        <a href="profile.html"><i class="fa-regular fa-user"></i> My Profile</a>
        <a href="my-applications.html"><i class="fa-solid fa-list-check"></i> My Applications</a>
        <a href="resumeupload.html"><i class="fa-solid fa-file-arrow-up"></i> Upload Resume</a>
        <div class="user-menu-divider"></div>
        <a href="#" onclick="logout()" class="text-danger"><i class="fa-solid fa-right-from-bracket text-danger"></i> Sign out</a>
      </div>
    `;
  }

  const profileToggle = document.getElementById('profileMenuToggle') || document.querySelector('a[href="signIn.html"]');
  const anchorParent = profileToggle.parentElement;

  anchorParent.style.position = 'relative';
  anchorParent.appendChild(menu);

  // Remove menu when clicking elsewhere or on a link
  setTimeout(() => {
    document.addEventListener('click', function removeMenu(e) {
      if (!menu.contains(e.target) || e.target.closest('a')) {
        menu.remove();
        document.removeEventListener('click', removeMenu);
      }
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

    // Safely parse JSON only if the response is actually JSON
    const contentType = response.headers.get('content-type');
    let data;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const textData = await response.text();
      data = { message: textData || 'Unexpected server response format' };
    }

    if (!response.ok) {
      throw new Error(data.message || 'API call failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Global pill filter state
const activePillFilters = {
  pay: '',
  remote: '',
  distance: '',
  company: '',
  type: '',
  postedBy: '',
  education: ''
};

function setFilter(filterType, value, displayLabel) {
  activePillFilters[filterType] = value;

  // Update the button visually
  const btnId = `${filterType}FilterBtn`;
  const btn = document.getElementById(btnId);
  if (btn) {
    if (value === '' || value === 'exact') {
      // Reset to default look
      btn.innerHTML = `${displayLabel} <i class="fa-solid fa-caret-down" style="font-size: 0.75rem;"></i>`;
      btn.classList.remove('active');
    } else {
      // Set to active look
      btn.innerHTML = `${displayLabel} <i class="fa-solid fa-caret-down" style="font-size: 0.75rem;"></i>`;
      btn.classList.add('active');
    }
  }

  // Auto trigger the search when a pill is clicked
  searchJobs(1);
}

// Job search functionality
async function searchJobs(page = 1) {
  try {
    showLoadingState();

    const searchInput = document.getElementById('searchInput');
    const locationInput = document.getElementById('locationInput');
    const params = new URLSearchParams();

    // Add pagination
    params.append('page', page);
    params.append('limit', 10);

    // Add core text searches if present
    if (searchInput && searchInput.value.trim()) {
      params.append('keyword', searchInput.value.trim());
    }
    if (locationInput && locationInput.value.trim()) {
      params.append('location', locationInput.value.trim());
    }

    // Add pill filters if present
    if (activePillFilters.pay) params.append('minSalary', activePillFilters.pay);
    if (activePillFilters.remote) params.append('remoteSetting', activePillFilters.remote);
    if (activePillFilters.type) params.append('type', activePillFilters.type);
    if (activePillFilters.company) params.append('company', activePillFilters.company);
    // (Other filters can be wired into the backend as needed)

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
      <div class="text-center py-5 empty-state">
        <img src="https://cdni.iconscout.com/illustration/premium/thumb/empty-state-2130362-1800926.png" alt="No Jobs Found" style="max-height: 200px; opacity: 0.8; margin-bottom: 1.5rem;">
        <h4 class="fw-bold text-dark">No jobs found</h4>
        <p class="text-muted">We couldn't find any matches for your search. Try adjusting your filters or keywords.</p>
        <button class="btn btn-outline-primary mt-2" onclick="
          document.getElementById('searchInput').value=''; 
          document.getElementById('locationInput').value=''; 
          document.getElementById('filterType').value='';
          document.getElementById('filterExperience').value='';
          document.getElementById('filterCategory').value='';
          window.LookNepal.handleSearch();
        ">Clear Search</button>
      </div>
    `;
    const fastView = document.querySelector('.fastviewjob');
    if (fastView) fastView.style.display = 'none';
    return;
  }

  jobCards.innerHTML = jobs.map(job => createJobCard(job)).join('');

  const fastView = document.querySelector('.fastviewjob');
  if (fastView) {
    fastView.style.display = 'block';
    if (jobs.length > 0 && window.innerWidth >= 992) {
      viewJobDetails(jobs[0]._id, true);
    }
  }
}

function createJobCard(job) {
  const salary = job.salary ?
    `Rs.${job.salary.min.toLocaleString()} - Rs.${job.salary.max.toLocaleString()} a month` :
    'Salary not specified';

  const company = job.company || {};
  const location = job.location ? `${job.location.city}, ${job.location.country}` : 'Location not specified';
  const postedDate = new Date(job.createdAt).toLocaleDateString();
  const daysAgo = Math.floor((new Date() - new Date(job.createdAt)) / (1000 * 60 * 60 * 24));

  const isSaved = currentUser && currentUser.savedJobs && currentUser.savedJobs.includes(job._id);
  const bookmarkHTML = currentUser && currentUser.userType === 'job_seeker' ? `
    <button class="btn bookmark-btn border-0 bg-transparent p-0 ms-3" aria-label="Save job" onclick="event.stopPropagation(); LookNepal.toggleSavedJob('${job._id}', this)">
      <i class="${isSaved ? 'fa-solid text-primary' : 'fa-regular text-secondary'} fa-bookmark fs-5"></i>
    </button>
  ` : `
    <button class="btn bookmark-btn border-0 bg-transparent p-0 ms-3" aria-label="Save job" onclick="event.stopPropagation(); window.location.href='signIn.html'">
      <i class="fa-regular text-secondary fa-bookmark fs-5"></i>
    </button>
  `;

  return `
    <div class="card mb-3" onclick="viewJobDetails('${job._id}')" style="cursor: pointer;">
      <div class="card-body position-relative">
        <div class="d-flex justify-content-between align-items-start">
          <h5 class="card-title fw-bold text-dark">${job.title}</h5>
          ${bookmarkHTML}
        </div>
        <p class="card-company text-muted mb-2">${company.name || 'Company Name'} ${company.rating ? company.rating.overall : ''}</p>
        <div class="d-flex gap-2 flex-wrap mb-3">
          <div class="job-feature-box bg-light text-secondary px-2 py-1 rounded small fw-semibold">
            <p class="feature-salary m-0">${salary}</p>
          </div>
          <div class="job-feature-box bg-light text-secondary px-2 py-1 rounded small fw-semibold">
            <p class="feature-type m-0">${job.jobType || 'Full-time'}</p>
          </div>
          <div class="job-feature-box bg-light text-secondary px-2 py-1 rounded small fw-semibold">
            <p class="feature-type m-0">${job.experienceLevel || 'All levels'}</p>
          </div>
        </div>
        <ul class="text-muted small mb-2 list-unstyled d-flex gap-3">
          <li><i class="fa-solid fa-location-dot me-1"></i>${location}</li>
          ${job.location && job.location.isRemote ? '<li><i class="fa-solid fa-house-laptop me-1"></i>Remote</li>' : ''}
        </ul>
        <p class="card-text text-muted small mt-2">Posted ${daysAgo === 0 ? 'Today' : daysAgo + ' days ago'}</p>
      </div>
    </div>
  `;
}

// Toggle Save functionality
async function toggleSavedJob(jobId, buttonElement) {
  if (!currentUser || currentUser.userType !== 'job_seeker') {
    window.location.href = 'signIn.html';
    return;
  }

  try {
    const icon = buttonElement.querySelector('i');

    // Optimistic UI update
    if (icon.classList.contains('fa-regular')) {
      icon.classList.remove('fa-regular', 'text-secondary');
      icon.classList.add('fa-solid', 'text-primary');
    } else {
      icon.classList.remove('fa-solid', 'text-primary');
      icon.classList.add('fa-regular', 'text-secondary');
    }

    const data = await apiCall(`/users/saved-jobs/${jobId}`, {
      method: 'POST'
    });

    // Update global state
    currentUser.savedJobs = data.savedJobs;
    LookNepal.setCurrentUser(currentUser);

  } catch (error) {
    console.error('Failed to toggle save job:', error);
    // Revert icon if failed
    const icon = buttonElement.querySelector('i');
    if (icon.classList.contains('fa-regular')) {
      icon.classList.remove('fa-regular', 'text-secondary');
      icon.classList.add('fa-solid', 'text-primary');
    } else {
      icon.classList.remove('fa-solid', 'text-primary');
      icon.classList.add('fa-regular', 'text-secondary');
    }
    showError('Could not save job.');
  }
}


async function viewJobDetails(jobId, preventRedirect = false) {
  const fastView = document.querySelector('.fastviewjob');
  // If no fast view container exists or on mobile (and not auto-loading), redirect
  if (!fastView || (!preventRedirect && window.innerWidth < 992)) {
    window.location.href = `job-details.html?id=${jobId}`;
    return;
  }

  try {
    fastView.style.opacity = '0.5';
    const data = await apiCall(`/jobs/${jobId}`);
    const job = data.job;
    const company = job.company || {};
    const salary = job.salary ? formatSalary(job.salary.min, job.salary.max) : 'Salary not specified';

    fastView.querySelector('.card-title').textContent = job.title;
    fastView.querySelector('.card-company').textContent = company.name || 'Company Name';

    const salaryEl = fastView.querySelector('.feature-salary');
    if (salaryEl) salaryEl.textContent = salary;

    const typeEls = fastView.querySelectorAll('.feature-type');
    if (typeEls.length > 0) typeEls[0].textContent = job.jobType || 'Full-time';

    fastView.querySelector('.fastjobview-details').innerHTML = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h6 class="fw-bold mb-2">Job Description</h6>
        <p>${job.description || 'No description provided.'}</p>
        
        <h6 class="fw-bold mb-2 mt-4">Requirements</h6>
        <p>${job.requirements || 'No specific requirements listed.'}</p>
        
        ${job.responsibilities ? `<h6 class="fw-bold mb-2 mt-4">Responsibilities</h6><p>${job.responsibilities}</p>` : ''}
        ${job.benefits ? `<h6 class="fw-bold mb-2 mt-4">Benefits</h6><p>${job.benefits}</p>` : ''}
      </div>
    `;

    const applyBtn = fastView.querySelector('.apply-btn');
    if (applyBtn) applyBtn.href = `job-details.html?id=${job._id}&apply=true`;

    const daysAgo = Math.floor((new Date() - new Date(job.createdAt)) / (1000 * 60 * 60 * 24));
    const cardText = fastView.querySelector('.card-text');
    if (cardText) cardText.textContent = `Posted ${daysAgo} days ago`;

    // Highlight the active card in the list
    document.querySelectorAll('.job-lists .card.mb-3').forEach(c => {
      c.style.border = '1px solid #e5e7eb';
      c.style.backgroundColor = '#ffffff';
    });
    const activeCard = Array.from(document.querySelectorAll('.job-lists .card.mb-3')).find(c => c.getAttribute('onclick').includes(jobId));
    if (activeCard) {
      activeCard.style.border = '1px solid #0d47a1';
      activeCard.style.backgroundColor = '#f8fbfc';
    }

    fastView.style.opacity = '1';

  } catch (e) {
    console.error("Failed to fetch fast view details", e);
    showError("Could not load job details.");
    fastView.style.opacity = '1';
  }
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
  const existingAlert = document.getElementById('errorAlert');
  if (existingAlert) {
    existingAlert.remove();
  }

  const alertDiv = document.createElement('div');
  alertDiv.id = 'errorAlert';
  alertDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3 shadow z-3';
  alertDiv.style.zIndex = '1050';

  alertDiv.innerHTML = `
    <strong>Error!</strong> ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  `;

  document.body.appendChild(alertDiv);

  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.classList.remove('show');
      setTimeout(() => alertDiv.remove(), 150);
    }
  }, 5000);
}

function updatePagination(pagination) {
  const container = document.getElementById('paginationContainer');
  if (!container) return; // Not all pages have pagination

  if (!pagination || pagination.total <= 1) {
    container.innerHTML = '';
    return;
  }

  const { current, total } = pagination;

  let html = '<ul class="pagination">';

  // Previous button
  html += `
    <li class="page-item ${current === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="event.preventDefault(); window.LookNepal.searchJobs(${current - 1})" aria-label="Previous">
        <span aria-hidden="true">&laquo;</span>
      </a>
    </li>
  `;

  // Page numbers
  for (let i = 1; i <= total; i++) {
    html += `
      <li class="page-item ${current === i ? 'active' : ''}">
        <a class="page-link" href="#" onclick="event.preventDefault(); window.LookNepal.searchJobs(${i})">${i}</a>
      </li>
    `;
  }

  // Next button
  html += `
    <li class="page-item ${current === total ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="event.preventDefault(); window.LookNepal.searchJobs(${current + 1})" aria-label="Next">
        <span aria-hidden="true">&raquo;</span>
      </a>
    </li>
  `;

  html += '</ul>';
  container.innerHTML = html;
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

  // Load initial jobs if on a page with job listings
  if (document.getElementById('jobListContainer')) {
    await searchJobs();
  }

  // Search functionality
  if (searchButton) {
    searchButton.addEventListener('click', handleSearch);
  }

  if (searchInput) {
    let debounceTimer;
    const dropdown = document.getElementById('autocompleteDropdown');

    // Handle typing for autocomplete
    searchInput.addEventListener('input', function (e) {
      clearTimeout(debounceTimer);
      const query = e.target.value.trim();

      if (query.length < 2) {
        if (dropdown) dropdown.style.display = 'none';
        return;
      }

      debounceTimer = setTimeout(async () => {
        try {
          const suggestions = await apiCall(`/jobs/suggestions?q=${encodeURIComponent(query)}`);
          if (dropdown) {
            if (suggestions.length > 0) {
              dropdown.innerHTML = suggestions.map(item => {
                const lowerTitle = item.title.toLowerCase();
                const lowerQuery = query.toLowerCase();
                const matchIndex = lowerTitle.indexOf(lowerQuery);

                let formattedTitle = item.title;
                if (matchIndex !== -1) {
                  const before = item.title.substring(0, matchIndex);
                  const match = item.title.substring(matchIndex, matchIndex + query.length);
                  const after = item.title.substring(matchIndex + query.length);
                  formattedTitle = (before ? `<span class="fw-bold">${before}</span>` : '') +
                    `<span class="fw-normal">${match}</span>` +
                    (after ? `<span class="fw-bold">${after}</span>` : '');
                } else {
                  formattedTitle = `<span class="fw-bold">${item.title}</span>`;
                }

                return `
                <li><a class="dropdown-item py-3 px-4 d-flex align-items-center gap-3" href="#" onclick="
                  event.preventDefault();
                  document.getElementById('searchInput').value = '${item.title.replace(/'/g, "\\'")}';
                  document.getElementById('autocompleteDropdown').style.display = 'none';
                  window.LookNepal.handleSearch();
                ">
                  <i class="fa-solid fa-magnifying-glass fs-5 text-dark"></i>
                  <div class="text-dark" style="font-size: 1.1rem; letter-spacing: -0.2px;">${formattedTitle}</div>
                </a></li>
                `;
              }).join('');
              dropdown.style.display = 'block';
            } else {
              dropdown.style.display = 'none';
            }
          }
        } catch (error) {
          console.error('Error fetching suggestions', error);
        }
      }, 300); // 300ms debounce
    });

    // Close dropdown on click outside
    document.addEventListener('click', function (e) {
      if (dropdown && !searchInput.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });

    // Handle Enter key for literal search
    searchInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        if (dropdown) dropdown.style.display = 'none';
        handleSearch();
      }
    });
  }
});

function handleSearch() {
  const filterSidebar = document.getElementById('filterSidebar');
  if (filterSidebar) {
    filterSidebar.classList.remove('d-none');
    filterSidebar.classList.add('d-lg-block'); // Restore responsive visibility
  }
  searchJobs(1);
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
  handleSearch,
  setFilter,
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
