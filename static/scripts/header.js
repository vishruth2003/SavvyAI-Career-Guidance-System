document.addEventListener('DOMContentLoaded', () => {
    const modeToggle = document.getElementById('mode-toggle');
    const body = document.body;
    const profileIcon = document.getElementById("profile-icon");
    const profileModal = document.getElementById("profile-modal");
    const welcomeMessage = document.getElementById("welcome-message");

    // Light/Dark mode toggle functionality
    modeToggle.addEventListener('click', () => {
        body.classList.toggle('light-mode');
        updateToggleButtonAriaLabel();
    });

    function updateToggleButtonAriaLabel() {
        modeToggle.setAttribute('aria-label', body.classList.contains('light-mode') ? 'Switch to dark mode' : 'Switch to light mode');
    }

    // Profile management functions
    function updateProfileIcon(user) {
        profileIcon.textContent = user.fullName.charAt(0).toUpperCase();
        profileIcon.style.display = 'block';
        welcomeMessage.textContent = `Hi, ${user.fullName}`;

        profileIcon.addEventListener("click", () => {
            profileModal.style.display = profileModal.style.display === "block" ? "none" : "block";
        });

        const logoutButton = document.getElementById("logout-btn");
        logoutButton.addEventListener("click", handleLogout);
    }

    function handleLogout() {
        fetch('/api/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('Logged out', 'error');
                profileModal.style.display = "none";
                profileIcon.style.display = 'none';

                // Dispatch custom event for other scripts to handle logout
                document.dispatchEvent(new CustomEvent('userLoggedOut'));
                setTimeout(() => {
                // Redirect to login page
                window.location.href = '/';
            }, 2000); // 2 seconds delay
            } else {
                showAlert('Logout failed', 'error');
            }
        })
        .catch(error => {
            showAlert('Failed to connect to server', 'error');
        });
    }

    // Close modal if clicking outside
    window.addEventListener("click", (event) => {
        if (event.target !== profileIcon && !profileModal.contains(event.target)) {
            profileModal.style.display = "none";
        }
    });

    // Alert message system
    function showAlert(message, type = 'success') {
        const alertMessage = document.getElementById('alert-message');
        if (alertMessage) {
            alertMessage.textContent = message;
            alertMessage.className = `alert-message ${type}-message`;
            alertMessage.style.display = 'block';

            setTimeout(() => {
                alertMessage.style.display = 'none';
            }, 5000);
        }
    }

    // Check session data on page load
    function checkSessionData() {
        const user = JSON.parse(document.getElementById('user-data').textContent);
        if (user) {
            updateProfileIcon(user);
        }
    }

    // Expose functions to window for global access
    window.headerUtils = {
        updateProfileIcon,
        showAlert,
        checkSessionData
    };


    window.addEventListener('scroll', function() {
        const header = document.querySelector('header');
        if (window.scrollY > 0) {  // If the page is scrolled
            header.classList.add('scrolled'); // Add the 'scrolled' class to the header
        } else {
            header.classList.remove('scrolled'); // Remove the 'scrolled' class when at the top
        }
    });
    

    // Call checkSessionData on page load
    checkSessionData();
});
