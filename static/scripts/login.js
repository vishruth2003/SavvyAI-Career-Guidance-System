document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loginFormContainer = document.querySelector('.login-form');
    const signupFormContainer = document.querySelector('.signup-form');

    // Show signup form by default
    signupFormContainer.style.display = 'block';
    loginFormContainer.style.display = 'none';

    // Form toggle functions
    window.showLoginPrompt = () => {
        signupFormContainer.style.display = 'none';
        loginFormContainer.style.display = 'block';
    };

    window.showSignUpForm = () => {
        signupFormContainer.style.display = 'block';
        loginFormContainer.style.display = 'none';
    };

    // Password visibility toggle
    document.getElementById('togglePassword').addEventListener('click', () => 
        togglePasswordVisibility('password')
    );
    document.getElementById('togglePasswordLogin').addEventListener('click', () => 
        togglePasswordVisibility('login-password')
    );

    function togglePasswordVisibility(inputId) {
        const passwordInput = document.getElementById(inputId);
        const eyeIcon = document.getElementById(inputId === 'password' ? 'eyeIcon' : 'eyeIconLogin');
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        eyeIcon.classList.toggle('fa-eye');
        eyeIcon.classList.toggle('fa-eye-slash');
    }

    // Form submissions
    signupForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = {
            fullName: document.getElementById('fullname').value,
            email: document.getElementById('email').value,
            password: document.getElementById('password').value
        };

        try {
            const response = await fetch('/api/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            if (data.success) {
                window.headerUtils.showAlert('Account created successfully! You can now log in.', 'success');
                showLoginPrompt();
            } else {
                window.headerUtils.showAlert(data.message || 'An error occurred during signup.', 'error');
            }
        } catch (error) {
            window.headerUtils.showAlert('Failed to connect to server.', 'error');
        }
    });

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = {
            email: document.getElementById('login-email').value,
            password: document.getElementById('login-password').value
        };

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            if (data.success) {
                window.headerUtils.showAlert('Logged in successfully!', 'success');
                // Hide the forms after successful login
                signupFormContainer.style.display = 'none';
                loginFormContainer.style.display = 'none';
                // Update the profile icon with user data
                window.headerUtils.updateProfileIcon(data.user);
                
                // Redirect to profile page
                window.location.href = "/profile";
            } else {
                window.headerUtils.showAlert(data.message || 'Login failed. Please check your credentials.', 'error');
            }
        } catch (error) {
            window.headerUtils.showAlert('Failed to connect to server.', 'error');
        }
    });

    // Listen for logout event
    document.addEventListener('userLoggedOut', () => {
        showSignUpForm();
    });
});