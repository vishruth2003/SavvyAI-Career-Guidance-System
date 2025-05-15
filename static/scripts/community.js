// DOM elements
const postsContainer = document.getElementById('postsContainer');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const newPostBtn = document.getElementById('newPostBtn');
const newPostModal = document.getElementById('newPostModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const submitPostBtn = document.getElementById('submitPostBtn');
const newPostCommunity = document.getElementById('newPostCommunity');
const newPostTitle = document.getElementById('newPostTitle');
const newPostContent = document.getElementById('newPostContent');
const tabButtons = document.querySelectorAll('.tab-button');
const body = document.body;
const welcomeMessage = document.getElementById("welcome-message");

let activeTab = 'all';
let searchTerm = '';
let sortBy = 'recent';

// Event listeners
searchInput.addEventListener('input', updatePosts);
sortSelect.addEventListener('change', updatePosts);
newPostBtn.addEventListener('click', () => newPostModal.style.display = 'block');
closeModalBtn.addEventListener('click', () => newPostModal.style.display = 'none');
submitPostBtn.addEventListener('click', handleNewPost);
tabButtons.forEach(button => button.addEventListener('click', () => {
    activeTab = button.dataset.tab;
    tabButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    updatePosts();
}));

// Functions
async function handleLike(postId) {
    try {
        const response = await fetch(`/api/posts/${postId}/like`, {
            method: 'POST'
        });
        if (!response.ok) throw new Error('Failed to like post');
        updatePosts();
    } catch (error) {
        console.error('Error liking post:', error);
    }
}

async function updatePosts() {
    searchTerm = searchInput.value.toLowerCase();
    sortBy = sortSelect.value;
    
    try {
        const response = await fetch(`/api/posts?community=${activeTab}&search=${searchTerm}&sort=${sortBy}`);
        if (!response.ok) throw new Error('Failed to fetch posts');
        const posts = await response.json();
        renderPosts(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
    }
}

function renderPosts(posts) {
    postsContainer.innerHTML = '';
    posts.forEach(post => {
        const postElement = document.createElement('div');
        postElement.className = 'post-card';
        postElement.innerHTML = `
            <div class="post-header">
                <h2 class="post-title">${post.title}</h2>
                <span class="post-community">${getCommunityName(post.community)}</span>
            </div>
            <div class="post-author">
                <img src="${post.authorAvatar}" alt="${post.author}" class="avatar">
                <span>${post.author}</span>
            </div>
            <p class="post-content">${post.content}</p>
            <div class="post-tags">
                ${(post.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
            <div class="post-actions">
                <div class="action-buttons">
                    <button class="action-button like-button" data-id="${post._id}">
                        <i class='bx bx-like' style="font-size: 20px"></i> ${post.likes || 0}
                    </button>
                    <button class="action-button">
                        <i class='bx bx-comment' style="font-size: 20px"></i> ${post.comments || 0}
                    </button>
                    <button class="action-button">
                        <i class='bx bx-link' style="font-size: 20px"></i> ${post.shares || 0}
                    </button>
                    <button class="action-button save-button" data-id="${post._id}">
                        ${post.saved_by && post.saved_by.includes(currentUser.email) ? '🔖' : '🔖'}
                    </button>
                </div>
                <button class="button button-outline">Read More</button>
            </div>
        `;
        postsContainer.appendChild(postElement);
    });

    // Add event listeners for like and save buttons
    document.querySelectorAll('.like-button').forEach(button => {
        button.addEventListener('click', () => handleLike(button.dataset.id));
    });
    document.querySelectorAll('.save-button').forEach(button => {
        button.addEventListener('click', () => handleSave(button.dataset.id));
    });
}

async function handleNewPost() {
    if (!newPostCommunity.value || !newPostTitle.value || !newPostContent.value) {
        alert('Please fill in all fields');
        return;
    }

    const newPost = {
        community: newPostCommunity.value,
        title: newPostTitle.value,
        content: newPostContent.value,
        tags: [] // You could add a tags input field if needed
    };

    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newPost)
        });

        if (!response.ok) throw new Error('Failed to create post');

        newPostModal.style.display = 'none';
        newPostCommunity.value = '';
        newPostTitle.value = '';
        newPostContent.value = '';
        updatePosts();
    } catch (error) {
        console.error('Error creating post:', error);
        alert('Failed to create post. Please try again.');
    }
}

async function handleLike(postId) {
    try {
        const response = await fetch(`/api/posts/${postId}/like`, {
            method: 'POST'
        });
        if (!response.ok) throw new Error('Failed to like post');
        updatePosts();
    } catch (error) {
        console.error('Error liking post:', error);
    }
}

async function handleSave(postId) {
    try {
        const response = await fetch(`/api/posts/${postId}/save`, {
            method: 'POST'
        });
        if (!response.ok) throw new Error('Failed to save post');
        updatePosts();
    } catch (error) {
        console.error('Error saving post:', error);
    }
}

function getCommunityName(communityId) {
    const communities = {
        frontend: "Frontend Developers",
        backend: "Backend Developers",
        hackerspace: "Hackerspaces",
        ai: "AI & Machine Learning",
        cloud: "Cloud Computing"
    };
    return communities[communityId] || communityId;
}

// Initial render
updatePosts();

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target === newPostModal) {
        newPostModal.style.display = "none";
    }
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

// Call checkSessionData on page load
checkSessionData();