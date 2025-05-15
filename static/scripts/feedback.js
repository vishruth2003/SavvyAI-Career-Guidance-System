document.addEventListener('DOMContentLoaded', function() {
    const feedbackForm = document.getElementById('feedbackForm');
    const thankYouMessage = document.getElementById('thankYouMessage');
    const stars = document.querySelectorAll('.rating input');

    // Star rating functionality
    stars.forEach((star) => {
        star.addEventListener('change', function() {
            const rating = this.value;
            // Remove all previous classes
            stars.forEach(s => s.parentElement.classList.remove('selected'));
            // Add selected class to current and previous stars
            for(let i = 0; i < rating; i++) {
                stars[i].parentElement.classList.add('selected');
            }
        });
    });

    // Form submission
    feedbackForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = {
            name: document.getElementById('name').value,
            email: document.getElementById('email').value,
            userType: document.getElementById('userType').value,
            rating: document.querySelector('input[name="rating"]:checked')?.value,
            helpfulness: document.getElementById('helpfulness').value,
            accuracy: document.getElementById('accuracy').value,
            nptelUsefulness: document.getElementById('nptelUsefulness').value,
            improvements: document.getElementById('improvements').value,
            submitted_at: new Date().toISOString()
        };

        try {
            const response = await fetch('/api/submit-feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (data.success) {
                feedbackForm.style.display = 'none';
                thankYouMessage.style.display = 'flex';
                // Removed the redirect code, so it will stay on the thank you message
            } else {
                throw new Error(data.message || 'Failed to submit feedback');
            }
        } catch (error) {
            alert('Error: ' + error.message);
        }
    });
});