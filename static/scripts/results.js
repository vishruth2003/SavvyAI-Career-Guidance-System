document.getElementById('fetch-suggestions').onclick = function() {
    // Show loading modal
    document.getElementById('loadingModal').style.display = 'flex';

    fetch('/fetch_suggestions')
        .then(response => {
            if (response.redirected) {
                window.location.href = response.url;
            } else {
                return response.json();
            }
        })
        .then(data => {
            document.getElementById('loadingModal').style.display = 'none';

            if (data) {
                if (data.success) {
                    document.getElementById('suggestions').innerHTML = JSON.stringify(data.suggestions, null, 2);
                } else {
                    document.getElementById('suggestions').innerHTML = "Error: " + (data.message || 'Unknown error occurred.');
                }
            } else {
                document.getElementById('suggestions').innerHTML = "Error: No data returned from server.";
            }
        })
        .catch(error => {
            document.getElementById('loadingModal').style.display = 'none';
            document.getElementById('suggestions').innerHTML = "An error occurred: " + (error.message || 'Unknown error.');
        });
};
