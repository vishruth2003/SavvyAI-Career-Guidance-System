const predefinedQuestions = [
    { question: "Imagine you are stranded on a deserted island. What three items would you bring and why?" },
    { question: "You have been given a million dollars to start a business. What kind of business would you start and why?" },
    { question: "You have the power to change one thing in the world. What would it be and why?" },
    { question: "If you could have any superpower, what would it be and why?" },
    { question: "Describe a time when you overcame a significant challenge. What did you learn from it?" },
    { question: "If you could travel anywhere in the world, where would you go and why?" },
    { question: "What is the most important value you hold in life and why?" },
    { question: "If you could meet any historical figure, who would it be and why?" }
];

let currentQuestionIndex = 0;
let userResponses = {};

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
        }

        // Store user response with the question as the key
        const currentQuestion = predefinedQuestions[currentQuestionIndex].question;
        userResponses[currentQuestion] = userMessage;

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
});

function showModal() {
    const modal = document.getElementById('modal');
    modal.style.display = 'flex';
}

function handleContinueButtonClick() {
    // Ensure all questions are answered
    if (Object.keys(userResponses).length < predefinedQuestions.length) {
        alert('Please answer all questions before continuing.');
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

    fetch('/save-scenario-data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(userResponses),
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
