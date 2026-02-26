// js/admin.js

document.addEventListener('DOMContentLoaded', () => {
    // Verify admin access
    const user = JSON.parse(localStorage.getItem('currentUser'));
    const token = localStorage.getItem('authToken');

    if (!user || user.userType !== 'admin' || !token) {
        console.warn('Access denied. Administrator privileges required.');
        // Show an inline warning instead of a blocking alert
        document.body.innerHTML = `
            <div class="d-flex justify-content-center align-items-center vh-100 bg-light">
                <div class="text-center p-5 bg-white rounded shadow-sm">
                    <h2 class="text-danger mb-3"><i class="fa-solid fa-triangle-exclamation"></i> Access Denied</h2>
                    <p class="text-muted">Administrator privileges are required to view this page.</p>
                    <a href="index.html" class="btn btn-primary mt-3">Return Home</a>
                </div>
            </div>
        `;
        setTimeout(() => window.location.href = 'index.html', 3000);
        return;
    }

    // Set Admin Name
    document.getElementById('adminName').textContent = user.firstName || user.name || 'Admin';

    // Navigation Logic
    const navLinks = document.querySelectorAll('.admin-nav .nav-link[data-target]');
    const sections = document.querySelectorAll('.content-section');
    const pageTitle = document.getElementById('pageTitle');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // Remove active class from all links and sections
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            // Add active class to clicked link and corresponding section
            link.classList.add('active');
            const targetId = link.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');

            // Update page title
            pageTitle.textContent = link.textContent.trim() + ' Overview';

            // Load data based on view
            if (targetId === 'dashboardView') loadStats();
            if (targetId === 'usersView') loadUsers();
            if (targetId === 'jobsView') loadJobs();
        });
    });

    // Initial Load
    loadStats();
    loadUsers(); // Preload

    // Setup user search listener
    document.getElementById('userSearch').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const rows = document.querySelectorAll('#usersTableBody tr');
        rows.forEach(row => {
            const name = row.cells[0]?.textContent.toLowerCase() || '';
            const email = row.cells[1]?.textContent.toLowerCase() || '';
            if (name.includes(searchTerm) || email.includes(searchTerm)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    });

    // Make Stats Cards Clickable
    const statCards = document.querySelectorAll('.stat-card');
    statCards.forEach(card => {
        card.style.cursor = 'pointer';
        card.style.transition = 'transform 0.2s';
        card.addEventListener('mouseenter', () => card.style.transform = 'translateY(-2px)');
        card.addEventListener('mouseleave', () => card.style.transform = 'none');
        card.addEventListener('click', () => {
            const label = card.querySelector('.stat-label').textContent.toLowerCase();
            if (label.includes('user') || label.includes('employer')) {
                document.querySelector('.nav-link[data-target="usersView"]').click();
            } else if (label.includes('job') || label.includes('application')) {
                document.querySelector('.nav-link[data-target="jobsView"]').click();
            }
        });
    });
});

// Admin API calls will use window.LookNepal.apiCall

// Load Dashboard Statistics
async function loadStats() {
    try {
        const stats = await window.LookNepal.apiCall('/admin/stats');

        document.getElementById('statTotalUsers').textContent = stats.users.total;
        document.getElementById('statEmployers').textContent = stats.users.employers;
        document.getElementById('statActiveJobs').textContent = stats.jobs.active;
        document.getElementById('statApplications').textContent = stats.applications.total;
    } catch (error) {
        console.error("Stats load failed:", error);
    }
}

// Load Users Table
async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    try {
        const users = await window.LookNepal.apiCall('/admin/users');

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">No users found.</td></tr>';
            return;
        }

        tbody.innerHTML = users.map(user => `
            <tr>
                <td class="fw-bold">${user.firstName || ''} ${user.lastName || user.name || ''}</td>
                <td>${user.email}</td>
                <td><span class="text-capitalize text-muted">${user.userType.replace('_', ' ')}</span></td>
                <td>
                    <span class="badge-status ${user.isActive ? 'badge-active' : 'badge-inactive'}">
                        ${user.isActive ? 'Active' : 'Inactive'}
                    </span>
                </td>
                <td>
                    <button class="action-btn toggle" onclick="toggleUserStatus('${user._id}')" title="Toggle Status">
                        <i class="fa-solid ${user.isActive ? 'fa-ban' : 'fa-check'}"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteUser('${user._id}')" title="Delete User">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4">Failed to load users.</td></tr>';
    }
}

// Load Jobs Table
async function loadJobs() {
    const tbody = document.getElementById('jobsTableBody');
    try {
        const jobs = await window.LookNepal.apiCall('/admin/jobs');

        if (jobs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4">No jobs found.</td></tr>';
            return;
        }

        tbody.innerHTML = jobs.map(job => {
            const companyName = job.postedBy ? `${job.postedBy.firstName} ${job.postedBy.lastName}` : 'Unknown';
            return `
                <tr>
                    <td class="fw-bold">${job.title}</td>
                    <td>${companyName}</td>
                    <td>
                        <span class="badge-status ${job.status === 'active' ? 'badge-active' : 'badge-inactive'}">
                            ${job.status}
                        </span>
                    </td>
                    <td>${new Date(job.createdAt).toLocaleDateString()}</td>
                    <td>
                        <button class="action-btn delete" onclick="deleteJob('${job._id}')" title="Delete Job">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-4">Failed to load jobs.</td></tr>';
    }
}

// Admin Actions
async function toggleUserStatus(userId) {
    if (!confirm('Are you sure you want to toggle this user\'s status?')) return;
    try {
        await window.LookNepal.apiCall(`/admin/users/${userId}/status`, { method: 'PUT' });
        loadUsers(); // refresh
    } catch (error) {
        console.error("Toggle user failed:", error);
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to permanently delete this user? This cannot be undone.')) return;
    try {
        await window.LookNepal.apiCall(`/admin/users/${userId}`, { method: 'DELETE' });
        loadUsers(); // refresh
        loadStats();
    } catch (error) {
        console.error("Delete user failed:", error);
    }
}

async function deleteJob(jobId) {
    if (!confirm('Are you sure you want to permanently delete this job?')) return;
    try {
        await window.LookNepal.apiCall(`/admin/jobs/${jobId}`, { method: 'DELETE' });
        loadJobs(); // refresh
        loadStats();
    } catch (error) {
        console.error("Delete job failed:", error);
    }
}
