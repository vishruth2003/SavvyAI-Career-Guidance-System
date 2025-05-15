// Global variables to store user data and chart instance
let userData = null;
let aptitudeChart = null;

// Create alert container on load
document.addEventListener('DOMContentLoaded', () => {
    const alertContainer = document.createElement('div');
    alertContainer.id = 'alert-container';
    document.body.appendChild(alertContainer);
});

// Show alert function
function showAlert(message, type = 'success', duration = 3000) {
    const alertId = 'alert-' + Date.now();
    const alertElement = document.createElement('div');
    alertElement.className = `alert-modal ${type}`;
    alertElement.id = alertId;

    alertElement.innerHTML = `
        <div class="alert-modal-content">
            <span class="alert-modal-message">${message}</span>
            <button class="alert-modal-close">&times;</button>
        </div>
    `;

    document.getElementById('alert-container').appendChild(alertElement);

    // Show alert
    setTimeout(() => {
        alertElement.style.display = 'block';
    }, 100);

    // Setup close button
    const closeBtn = alertElement.querySelector('.alert-modal-close');
    closeBtn.onclick = () => {
        alertElement.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => alertElement.remove(), 300);
    };

    // Auto dismiss
    if (duration > 0) {
        setTimeout(() => {
            if (document.getElementById(alertId)) {
                alertElement.style.animation = 'slideOut 0.3s ease-out forwards';
                setTimeout(() => alertElement.remove(), 300);
            }
        }, duration);
    }
}

// Fetch user data from the API
async function fetchUserData() {
    try {
        const response = await fetch('http://localhost:5000/api/profile-data');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        userData = await response.json();

        // Ensure keySkills is an array
        if (typeof userData.userData.keySkills === 'string') {
            userData.userData.keySkills = userData.userData.keySkills.split(',').map(skill => skill.trim());
        }

        // Initial load - initialize everything
        if (!aptitudeChart) {
            initializeAll();
        } else {
            // Subsequent updates - only update necessary components
            updateProfileData();
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
        showAlert('Error loading user data. Please try again later.', 'error');
    }
}

// Initialize all components with fetched data
function initializeAll() {
    initializeProfilePreview();
    initializeForm();
    initializeRecommendations();
    initializeAptitudeChart();
}

// Update only profile-related data
function updateProfileData() {
    initializeProfilePreview();
    initializeForm();
    initializeRecommendations();
}

// Initialize profile preview
function initializeProfilePreview() {
    document.getElementById('profile-name').textContent = userData.user.name;
    document.getElementById('profile-email').textContent = userData.user.email;
    document.getElementById('current-role').textContent = userData.userData.currentStatus;
    document.getElementById('hobbies-preview').textContent = userData.userData.hobbies;

    const skillsContainer = document.getElementById('skills-container');
    skillsContainer.innerHTML = '';

    // Check if keySkills is an array
    if (Array.isArray(userData.userData.keySkills)) {
        userData.userData.keySkills.forEach(skill => {
            const skillBadge = document.createElement('span');
            skillBadge.classList.add('skill-badge');
            skillBadge.textContent = skill;
            skillsContainer.appendChild(skillBadge);
        });
    } else {
        console.error('keySkills is not an array:', userData.userData.keySkills);
    }
}

// Initialize form
function initializeForm() {
    document.getElementById('name').value = userData.user.name;
    document.getElementById('email').value = userData.user.email;
    document.getElementById('age').value = userData.userData.age;
    document.getElementById('currentStatus').value = userData.userData.currentStatus;
    document.getElementById('education').value = userData.userData.education;
    document.getElementById('hobbies').value = userData.userData.hobbies;
    document.getElementById('githubLink').value = userData.userData.githubLink || '';
    document.getElementById('linkedinLink').value = userData.userData.linkedinLink || '';
    document.getElementById('workExperience').value = userData.userData.workExperience;

    // Ensure keySkills is an array before joining
    if (Array.isArray(userData.userData.keySkills)) {
        document.getElementById('skills').value = userData.userData.keySkills.join(', ');
    } else {
        console.error('keySkills is not an array:', userData.userData.keySkills);
    }

    document.getElementById('specialization').value = userData.userData.educationDetails.specialization;
    document.getElementById('course').value = userData.userData.educationDetails.course;
}

// Initialize recommendations
function initializeRecommendations() {
    const container = document.getElementById('recommendations-container');
    container.innerHTML = '';
    userData.careerSuggestions.forEach(career => {
        const careerDiv = document.createElement('div');
        careerDiv.classList.add('career-recommendation');
        careerDiv.innerHTML = `
            <p>${career.title}</p>
            <span class="skill-badge">${career.match} Match</span>
        `;
        container.appendChild(careerDiv);
    });
}

// Initialize aptitude chart
function initializeAptitudeChart() {
    const ctx = document.getElementById('aptitude-chart').getContext('2d');

    // Create new chart instance
    aptitudeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: userData.aptitudeScores.map(score => score.name),
            datasets: [{
                label: 'Aptitude Scores',
                data: userData.aptitudeScores.map(score => score.score),
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

// Tab functionality
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');

        tabBtns.forEach(btn => btn.classList.remove('active'));
        tabPanes.forEach(pane => pane.classList.remove('active'));

        btn.classList.add('active');
        document.getElementById(tabId).classList.add('active');
    });
});

// Form submission
document.getElementById('profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const updatedProfile = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        age: parseInt(document.getElementById('age').value, 10) || null,
        currentStatus: document.getElementById('currentStatus').value,
        education: document.getElementById('education').value,
        hobbies: document.getElementById('hobbies').value,
        githubLink: document.getElementById('githubLink').value,
        linkedinLink: document.getElementById('linkedinLink').value,
        workExperience: document.getElementById('workExperience').value,
        keySkills: document.getElementById('skills').value.split(',').map(skill => skill.trim()),
        educationDetails: {
            specialization: document.getElementById('specialization').value,
            course: document.getElementById('course').value
        }
    };

    try {
        const response = await fetch('http://localhost:5000/api/update-profile', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedProfile)
        });

        if (!response.ok) {
            throw new Error('Failed to update profile');
        }

        const result = await response.json();
        showAlert(result.message || 'Profile updated successfully!', 'success');

        // Refresh user data after update
        await fetchUserData();
    } catch (error) {
        console.error('Error updating profile:', error);
        showAlert('An error occurred while updating your profile. Please try again.', 'error');
    }
});

// Modal functionality
const modal = document.getElementById('full-profile-modal');
const modalClose = modal.querySelector('.close');
const viewFullProfileBtn = document.getElementById('view-full-profile');

// Update the existing modal functionality in the profile_overview.js file

viewFullProfileBtn.addEventListener('click', async () => {
    const modalContent = document.getElementById('modal-content');
    const qrCodePath = `/static/profile_cards/qrcode.png`;

    modalContent.innerHTML = `
        <div class="profile-card" id="downloadable-profile-card">
            <img src="${qrCodePath}" alt="QR Code" class="qr-code">
            <div class="profile-details">
                <p class="profile-text">
                    <b>${userData.user.name.toUpperCase()}</b> ,
                    ${userData.userData.educationDetails.specialization.toUpperCase()},
                    ${userData.userData.educationDetails.course.toUpperCase()}<br>
                    <a href="mailto:${userData.user.email}">${userData.user.email}</a>
                </p>
            </div>
            <button id="download-profile-card" class="btn btn-primary">Download Profile Card</button>
        </div>
    `;

    modal.style.display = 'flex';

    // Add download functionality
    const downloadBtn = document.getElementById('download-profile-card');
    downloadBtn.addEventListener('click', downloadProfileCard);
});

function downloadProfileCard() {
    const profileCard = document.getElementById('downloadable-profile-card');

    // Create a canvas with increased resolution
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    // Set canvas size (adjust as needed)
    canvas.width = 840; // 3x original size for high quality
    canvas.height = 1120; // 3x original size

    // Function to draw rounded rectangle
    function roundedRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + width, y, x + width, y + height, radius);
        ctx.arcTo(x + width, y + height, x, y + height, radius);
        ctx.arcTo(x, y + height, x, y, radius);
        ctx.arcTo(x, y, x + width, y, radius);
        ctx.closePath();
        return ctx;
    }

    // Set background
    context.fillStyle = '#F0F0F0';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Draw card background
    context.fillStyle = '#FFFFFF';
    const cardRadius = 40;
    roundedRect(context, 20, 20, canvas.width - 40, canvas.height - 40, cardRadius)
        .fill();

    // Load QR code image
    const qrCodeImg = new Image();
    qrCodeImg.onload = function() {
        try {
            // Draw QR Code (centered, with padding)
            const qrSize = 600;
            context.drawImage(
                qrCodeImg,
                (canvas.width - qrSize) / 2,
                100,
                qrSize,
                qrSize
            );

            // Prepare text styles
            context.fillStyle = '#000000';
            context.textAlign = 'center';

            // Draw name
            context.font = 'bold 48px Arial';
            context.fillText(
                userData.user.name.toUpperCase(),
                canvas.width / 2,
                canvas.height - 300
            );

            // Draw specialization
            context.font = '36px Arial';
            context.fillText(
                userData.userData.educationDetails.specialization.toUpperCase(),
                canvas.width / 2,
                canvas.height - 240
            );

            // Draw course
            context.fillText(
                userData.userData.educationDetails.course.toUpperCase(),
                canvas.width / 2,
                canvas.height - 180
            );

            // Draw email
            context.font = '32px Arial';
            context.fillStyle = '#0000EE';
            context.fillText(
                userData.user.email,
                canvas.width / 2,
                canvas.height - 100
            );

            // Convert to blob and download
            canvas.toBlob(function(blob) {
                const link = document.createElement('a');
                link.download = `${userData.user.name.replace(/\s+/g, '_')}_profile_card.png`;
                link.href = URL.createObjectURL(blob);
                link.click();
            });
        } catch (error) {
            console.error('Error creating profile card:', error);
            showAlert('Failed to create profile card. Please try again.', 'error');
        }
    };

    qrCodeImg.onerror = function() {
        console.error('Failed to load QR code image');
        showAlert('Failed to load QR code image.', 'error');
    };

    // Use the existing QR code image path
    qrCodeImg.src = `/static/profile_cards/qrcode.png`;
}

// Update modal event listener to use this new function
viewFullProfileBtn.addEventListener('click', async () => {
    const modalContent = document.getElementById('modal-content');
    const qrCodePath = `/static/profile_cards/qrcode.png`;

    modalContent.innerHTML = `
        <div class="profile-card" id="downloadable-profile-card">
            <img src="${qrCodePath}" alt="QR Code" class="qr-code">
            <div class="profile-details">
                <p class="profile-text">
                    <b>${userData.user.name.toUpperCase()}</b> ,
                    ${userData.userData.educationDetails.specialization.toUpperCase()},
                    ${userData.userData.educationDetails.course.toUpperCase()}<br>
                    <a href="mailto:${userData.user.email}">${userData.user.email}</a>
                </p>
            </div>
            <button id="download-profile-card" class="btn btn-primary">Download Profile Card</button>
        </div>
    `;

    modal.style.display = 'flex';

    // Add download functionality
    const downloadBtn = document.getElementById('download-profile-card');
    downloadBtn.addEventListener('click', downloadProfileCard);
});

// Close modal on outside click
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

// Initial fetch of user data on page load
fetchUserData();
