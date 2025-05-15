function openModal(id) {
    const modal = document.getElementById(`modal-${id}`);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    const modal = document.getElementById(`modal-${id}`);
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Close modal when clicking outside and trigger the OK button behavior
window.onclick = function(event) {
    const introModal = document.getElementById('intro-modal');
    const okButton = document.getElementById('ok-button');

    if (event.target.classList.contains('modal') || event.target === introModal) {
        // Trigger OK button behavior
        introModal.classList.remove('active');
        document.body.style.overflow = 'auto';

        // Call the Flask route
        fetch('/fetch_detailed_layout', {
            method: 'GET',
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Successfully fetched detailed layout:', data);
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
        });
    }
}

// Theme toggling functionality
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    const theme = document.body.classList.contains('light-mode') ? 'light' : 'dark';
    localStorage.setItem('theme', theme);
}

// Set initial theme
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
}

document.addEventListener('DOMContentLoaded', () => {
    // Show the intro modal on page load
    const introModal = document.getElementById('intro-modal');
    const okButton = document.getElementById('ok-button');

    okButton.addEventListener('click', () => {
        // Close the modal
        introModal.classList.remove('active');
        document.body.style.overflow = 'auto';

        // Call the Flask route
        fetch('/fetch_detailed_layout', {
            method: 'GET',
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Successfully fetched detailed layout:', data);
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
        });
    });
});
