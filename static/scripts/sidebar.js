document.addEventListener('DOMContentLoaded', function () {
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const sidebar = document.querySelector('.sidebar');
    const container = document.querySelector('.container');
    const logoutLink = document.getElementById('logout-link'); // Log out link

    // Toggle the sidebar open/close when hamburger is clicked
    hamburgerMenu.addEventListener('click', () => {
        sidebar.classList.toggle('open'); // Toggle sidebar open/close
        container.classList.toggle('shifted'); // Shift container accordingly

        // Optionally, change the hamburger icon when the sidebar is open
        if (sidebar.classList.contains('open')) {
            hamburgerMenu.classList.replace('bx-menu', 'bx-menu');
        }
    });

    // Handle the logout functionality
    logoutLink.addEventListener('click', function (e) {
        e.preventDefault(); // Prevent the default link action (navigation)
        
        fetch('/api/logout', {  // Directly use the logout route
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({})  // Send an empty body, as we only need to trigger the logout
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Redirect the user after successful logout
                window.location.href = '/';  // Or your desired redirect URL
            } else {
                alert('Logout failed!');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('An error occurred. Please try again.');
        });
    });
});
