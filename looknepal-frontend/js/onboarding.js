// js/onboarding.js

window.onboardingLogic = {
    state: {
        location: {
            city: '',
            state: ''
        },
        isRemote: false,
        expectedSalary: null,
        desiredJobTitles: [],
        profileVisibility: 'public'
    },

    nextStep: function (stepIndex) {
        // Validation (Optional) for empty fields before moving on can be added here

        // Save current step data into state
        if (stepIndex === 2) {
            const rawLocation = document.getElementById('inputCity').value.trim();
            const [city, state] = rawLocation.split(',').map(s => s.trim());
            this.state.location.city = city || rawLocation;
            this.state.location.state = state || '';
            this.state.isRemote = document.getElementById('inputRemote').checked;
        } else if (stepIndex === 3) {
            const salary = document.getElementById('inputSalary').value;
            this.state.expectedSalary = salary ? Number(salary) : null;
            // if we wanted to process per_hour vs per_year we would do so here
        } else if (stepIndex === 4) {
            const title = document.getElementById('inputJobTitle').value.trim();
            if (title) {
                this.state.desiredJobTitles = [title];
            }
        }

        this.showStep(stepIndex);
    },

    prevStep: function (stepIndex) {
        this.showStep(stepIndex);
    },

    showStep: function (stepIndex) {
        // Hide all
        document.querySelectorAll('.step-container').forEach(el => {
            el.classList.remove('active');
        });

        // Show target
        const target = document.getElementById('step' + stepIndex);
        if (target) {
            target.classList.add('active');
        }

        // Update progress bar
        const perc = stepIndex * 25;
        document.getElementById('progressBar').style.width = perc + '%';
        document.getElementById('progressText').innerText = perc + '% complete';
    },

    selectCard: function (cardElement) {
        // Remove selected class from all cards
        document.querySelectorAll('.selection-card').forEach(el => el.classList.remove('selected'));
        // Add selected class to chosen card
        cardElement.classList.add('selected');

        // Update state
        const radio = cardElement.querySelector('input[type="radio"]');
        if (radio) {
            this.state.profileVisibility = radio.value;
        }
    },

    submitSetup: async function (btnElement) {
        btnElement.disabled = true;
        btnElement.innerText = "Saving...";

        // Collect final step state
        const visRadios = document.getElementsByName('visibility');
        for (let r of visRadios) {
            if (r.checked) this.state.profileVisibility = r.value;
        }

        // Show overlay with thumb animation
        document.getElementById('successOverlay').style.display = 'flex';

        try {
            // Check if user is logged in (should be since they were redirected here)
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error("No auth token found, please log in.");
            }

            // Fire API call
            await LookNepal.apiCall('/users/onboarding', {
                method: 'PUT',
                body: JSON.stringify(this.state)
            });

            // Update local storage user flag to true, so it doesn't redirect again
            const userStr = localStorage.getItem('currentUser');
            if (userStr) {
                const user = JSON.parse(userStr);
                user.onboardingCompleted = true;
                localStorage.setItem('currentUser', JSON.stringify(user));
            }

            // Wait a moment for UX
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);

        } catch (error) {
            console.error(error);
            document.getElementById('successOverlay').style.display = 'none';
            btnElement.disabled = false;
            btnElement.innerText = "Continue";
            alert("Failed to save preferences: " + error.message);
        }
    }
};

// Check if user already completed onboarding, block direct access
document.addEventListener('DOMContentLoaded', () => {
    const user = window.LookNepal ? window.LookNepal.currentUser() : null;
    if (!user) {
        // User not logged in, shouldn't be here
        window.location.href = 'signIn.html';
        return;
    }

    if (user.onboardingCompleted) {
        // Already completed, bounce them back to home
        window.location.href = 'index.html';
    }
});
