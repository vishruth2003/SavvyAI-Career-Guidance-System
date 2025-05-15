const predefinedQuestions = [
    { question: "Hi, I am SavvyAI! I'm here to help you choose a career. Can you share what you've always dreamed of becoming?" },
    { question: "That's fantastic! Could you share something you're passionate about or deeply fascinated by that you'd love to explore further?" },
    { question: 'Are there any other interests or skills you\'d like to nurture and potentially turn into a career?' }
];

let currentQuestionIndex = 0;
let userResponses = {
    first: '',
    second: '',
    third: ''
};

const allSuggestions = [
    { "text": "Dreaming of a career in Software Engineering", "icon": "💻" },
    { "text": "Aspiring to become a Mechanical Engineer", "icon": "⚙️" },
    { "text": "Pursuing a path in Electrical Engineering", "icon": "🔌" },
    { "text": "Setting sights on Civil Engineering", "icon": "🏗️" },
    { "text": "Aiming for Aerospace Engineering", "icon": "🚀" },
    { "text": "Passionate about Robotics Engineering", "icon": "🤖" },
    { "text": "Exploring Chemical Engineering", "icon": "🧪" },
    { "text": "Targeting a career in Data Engineering", "icon": "📊" },
    { "text": "Committed to Biomedical Engineering", "icon": "🩺" },
    { "text": "Focused on Computer Network Engineering", "icon": "🌐" },
    { "text": "Dedicated to Environmental Engineering", "icon": "🌍" },
    { "text": "Diving into AI/Machine Learning Engineering", "icon": "🧠" },
    { "text": "Investigating Nuclear Engineering", "icon": "☢️" },
    { "text": "Venturing into Petroleum Engineering", "icon": "⛽" },
    { "text": "Advancing in Telecommunications Engineering", "icon": "📡" }
];

// Function to get four random suggestions
function getRandomSuggestions(num) {
    const shuffled = allSuggestions.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, num);
}

// Typing effect function
function typeMessage(message, container, speed = 30) {
    const chatMessage = document.createElement('div');
    chatMessage.classList.add('chat-message', 'bot');
    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    chatMessage.appendChild(messageContent);
    container.appendChild(chatMessage);

    let index = 0;
    return new Promise((resolve) => {
        function type() {
            if (index < message.length) {
                messageContent.textContent += message.charAt(index);
                index++;
                setTimeout(type, speed + Math.random() * 20); // Add slight randomness to typing
                container.scrollTop = container.scrollHeight;
            } else {
                resolve(chatMessage); // Resolve when typing is complete
            }
        }
        type();
    });
}

// Enhanced addChatMessage function
function addChatMessage(sender, message) {
    const chatContainer = document.getElementById('chatbot');
    
    if (sender === 'bot') {
        // Use typing effect for bot messages with a Promise
        return typeMessage(message, chatContainer);
    } else {
        // Instantaneous rendering for user messages
        const chatMessage = document.createElement('div');
        chatMessage.classList.add('chat-message', sender);
        const messageContent = document.createElement('div');
        messageContent.classList.add('message-content');
        messageContent.textContent = message;
        chatMessage.appendChild(messageContent);
        chatContainer.appendChild(chatMessage);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        return Promise.resolve(chatMessage);
    }
}

// Async loadNextQuestion function
async function loadNextQuestion() {
    if (currentQuestionIndex < predefinedQuestions.length) {
        await addChatMessage('bot', predefinedQuestions[currentQuestionIndex].question);
    } else {
        await addChatMessage('bot', 'Thank you for your responses!');
        setTimeout(showModal, 2000);
    }
}

// Async handleUserInput function
async function handleUserInput() {
    const chatInput = document.getElementById('chat-input');
    const userMessage = chatInput.value.trim();

    if (userMessage) {
        await addChatMessage('user', userMessage);
        
        // Hide the greeting and question after the first input
        if (currentQuestionIndex === 0) {
            const greeting = document.querySelector('.greeting');
            const question = document.querySelector('.question');
            greeting.style.display = 'none';
            question.style.display = 'none';

            // Hide the suggestions box after the first input
            const suggestions = document.querySelector('.suggestions');
            suggestions.style.display = 'none';
        }
        
        // Store user response in the appropriate property based on current question index
        switch (currentQuestionIndex) {
            case 0:
                userResponses.first = userMessage;
                break;
            case 1:
                userResponses.second = userMessage;
                break;
            case 2:
                userResponses.third = userMessage;
                break;
        }

        currentQuestionIndex++; // Move to the next question
        chatInput.value = '';
        await loadNextQuestion(); // Load the next question
    }
}

document.addEventListener('DOMContentLoaded', (event) => {
    const modeToggle = document.getElementById('mode-toggle');
    const body = document.body;

    // Light/Dark mode toggle functionality
    modeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        updateToggleButtonAriaLabel();
    });
    
    const randomSuggestions = getRandomSuggestions(5);
    const suggestionsContainer = document.querySelector('.suggestions');
    suggestionsContainer.innerHTML = ''; // Clear any existing suggestions

    // Populate suggestions dynamically
    randomSuggestions.forEach(suggestion => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'suggestion';

        // Set button content
        button.innerHTML = `
            <span class="suggestion-text">${suggestion.text}</span>
            <span class="suggestion-icon">${suggestion.icon}</span>
        `;

        // Attach click event to set the input
        button.addEventListener('click', function() {
            document.getElementById('chat-input').value = suggestion.text;
        });

        suggestionsContainer.appendChild(button);
    });

    function updateToggleButtonAriaLabel() {
        modeToggle.setAttribute('aria-label', body.classList.contains('dark-mode') ? 'Switch to dark mode' : 'Switch to light mode');
    }

    // Initial setup
    updateToggleButtonAriaLabel();
    loadNextQuestion();

    // Async event listeners
    document.getElementById('chat-input').addEventListener('keypress', async function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            await handleUserInput();
        }
    });

    document.getElementById('chat-form').addEventListener('submit', async function (e) {
        e.preventDefault();
        await handleUserInput();
    });

    document.getElementById('continue-button').addEventListener('click', handleContinueButtonClick);

    document.querySelectorAll('.suggestion').forEach(button => {
        button.addEventListener('click', function() {
            const suggestionText = this.querySelector('.suggestion-text').textContent;
            document.getElementById('chat-input').value = suggestionText;
        });
    });
});

function showModal() {
    const modal = document.getElementById('modal');
    modal.style.display = 'flex';
}

function handleContinueButtonClick() {
    // Ensure all three questions are answered
    if (!userResponses.first || !userResponses.second || !userResponses.third) {
        alert('Please answer all three questions before continuing.');
        return;
    }

    const continueButton = document.getElementById('continue-button');
    const modalContent = document.querySelector('.modal-content p');

    // Disable the button to prevent multiple clicks
    continueButton.disabled = true;

    // Change the button text to show loading state
    continueButton.innerHTML = '<span class="spinner"></span> Loading...';

    // Change the paragraph text to indicate waiting
    modalContent.textContent = 'Please wait...';

    const userData = {
        careerPreferences: userResponses // Store user responses as an object
    };

    fetch('/save-data/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
    })
    .then(response => {
        if (response.ok) {
            window.location.href = '/questions'; // Redirect to the new questions page
        } else {
            console.error('Failed to save data');
            alert('Failed to save data. Please try again.');
            continueButton.disabled = false;
            continueButton.innerHTML = 'Continue';
            modalContent.textContent = 'Press continue to begin analysis...';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while saving data. Please check your connection.');
        continueButton.disabled = false;
        continueButton.innerHTML = 'Continue';
        modalContent.textContent = 'Press continue to begin analysis...';
    });
}