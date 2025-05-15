document.addEventListener('DOMContentLoaded', () => {
    let questions = [];
    let currentQuestionIndex = 0;
    let selectedAnswers = {};

    const questionsDataElement = document.getElementById('questions-data');
    if (questionsDataElement) {
        questions = JSON.parse(questionsDataElement.textContent);
    }

    displayQuestion();
    updateButtons();

    const questionsContainer = document.querySelector('.questions-container');
    const previewContainer = document.querySelector('.preview-container');

    function showAlert(message, type = 'success') {
        const existingAlert = document.querySelector('.alert-modal');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        const alertModal = document.createElement('div');
        alertModal.className = `alert-modal ${type}`;
        
        const alertContent = document.createElement('div');
        alertContent.className = 'alert-modal-content';
        
        const messageDiv = document.createElement('div');
        messageDiv.className = 'alert-modal-message';
        messageDiv.textContent = message;
        
        const closeButton = document.createElement('button');
        closeButton.className = 'alert-modal-close';
        closeButton.innerHTML = '×';
        closeButton.onclick = () => {
            alertModal.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => alertModal.remove(), 300);
        };
        
        alertContent.appendChild(messageDiv);
        alertContent.appendChild(closeButton);
        alertModal.appendChild(alertContent);
        document.body.appendChild(alertModal);
        
        alertModal.style.display = 'block';
        
        setTimeout(() => {
            if (alertModal.parentNode) {
                alertModal.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => alertModal.remove(), 300);
            }
        }, 3000);
    }

    function showQuestions() {
        questionsContainer.style.display = 'block';
        previewContainer.style.display = 'none';
        document.body.classList.add('questions-layout');
    }

    function showPreview() {
        questionsContainer.style.display = 'none';
        previewContainer.style.display = 'block';
        document.body.classList.remove('questions-layout');
    }

    function displayQuestion() {
        const questionTitle = document.getElementById('question-text');
        const optionsList = document.getElementById('options-list');
        const questionNumber = document.getElementById('question-number');

        optionsList.innerHTML = '';

        if (questions.length > 0) {
            const currentQuestion = questions[currentQuestionIndex];
            
            questionTitle.textContent = `${currentQuestionIndex + 1}. ${currentQuestion.question}`;
            questionNumber.textContent = `Question ${currentQuestionIndex + 1} of ${questions.length}`;

            currentQuestion.options.forEach((option, index) => {
                const optionItem = document.createElement('li');
                optionItem.classList.add('option-item');
                optionItem.innerHTML = `
                    <input type="radio" name="option" id="option${index}" value="${option}">
                    <label for="option${index}">${option}</label>`;

                optionItem.addEventListener('click', () => {
                    selectOption(optionItem, option);
                });

                optionsList.appendChild(optionItem);
            });

            const previouslySelectedOption = selectedAnswers[currentQuestionIndex];
            if (previouslySelectedOption) {
                const selectedOption = document.querySelector(`input[value="${previouslySelectedOption}"]`);
                if (selectedOption) {
                    selectedOption.checked = true;
                    const selectedOptionItem = selectedOption.closest('li');
                    selectedOptionItem.classList.add('selected');
                }
            }
        }
    }

    function selectOption(optionItem, optionValue) {
        document.querySelectorAll('#options-list li').forEach(item => {
            item.classList.remove('selected');
        });

        optionItem.classList.add('selected');
        const radioInput = optionItem.querySelector('input[type="radio"]');
        if (radioInput) {
            radioInput.checked = true;
        }

        selectedAnswers[currentQuestionIndex] = optionValue;
    }

    function updateButtons() {
        document.getElementById('previous-btn').disabled = currentQuestionIndex === 0;
        const isLastQuestion = currentQuestionIndex === questions.length - 1;
        document.getElementById('next-btn').style.display = isLastQuestion ? 'none' : 'inline-block';
        document.getElementById('preview-btn').style.display = isLastQuestion ? 'inline-block' : 'none';
    }

    document.getElementById('next-btn').addEventListener('click', () => {
        if (!isOptionSelected()) {
            showAlert("Please select an option before proceeding to the next question.", "error");
            return;
        }

        const selectedOption = document.querySelector('input[name="option"]:checked');
        if (selectedOption) {
            selectedAnswers[currentQuestionIndex] = selectedOption.value;
        }

        if (currentQuestionIndex < questions.length - 1) {
            currentQuestionIndex++;
            displayQuestion();
            updateButtons();
        }
    });

    document.getElementById('previous-btn').addEventListener('click', () => {
        const selectedOption = document.querySelector('input[name="option"]:checked');
        if (selectedOption) {
            selectedAnswers[currentQuestionIndex] = selectedOption.value;
        }

        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            displayQuestion();
            updateButtons();
        }
    });

    document.getElementById('preview-btn').addEventListener('click', () => {
        const selectedOption = document.querySelector('input[name="option"]:checked');
        if (!selectedOption) {
            if (!selectedOption) {
                showAlert("Please select an option before previewing your test.", "error");
                return;
            }
            
            return;
        }

        const previewData = questions.map((question, index) => ({
            question: question.question,
            selectedAnswer: selectedAnswers[index] || 'Not answered',
        }));

        let previewHTML = '';
        previewData.forEach((item, index) => {
            previewHTML += `<p><strong>${index + 1}. ${item.question}</strong><br>`;
            previewHTML += `Selected Answer: ${item.selectedAnswer}</p>`;
        });

        document.getElementById('preview-content').innerHTML = previewHTML;
        showPreview();
    });


    document.getElementById('edit-btn').addEventListener('click', () => {
        currentQuestionIndex = 0;
        displayQuestion();
        updateButtons();
        showQuestions();
    });

    document.getElementById('submit-btn').addEventListener('click', async () => {
        const answers = [];
    
        // Prepare answers with their correctness and difficulty level
        for (let i = 0; i < questions.length; i++) {
            const question = questions[i];
            const answered = selectedAnswers[i] || 'Not answered';
            const correctAnswer = question.correct_answer;
            
            // Ensure the question has a difficulty level and that it's included in the sent data
            const difficultyLevel = question.difficulty_level || 'easy'; // Default to 'easy' if not provided
            
            answers.push({
                question: question.question,
                answered: answered,
                difficulty_level: difficultyLevel,  // Ensure difficulty level is added
            });
        }
    
        // Send answers to backend for saving in the MongoDB database
        const response = await fetch('/api/save-aptitude-answers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ answers }) // Send answers to the backend API
        });

        
    
        if (response.ok) {
            console.log('Submission successful');
            showSubmitModal();
        } else {
            console.log('Submission failed', response.status);
            alert("An error occurred while submitting your answers.");
        }
    });
    
    function showSubmitModal() {
        let modal = document.getElementById('submission-modal');
        if (modal) {
            modal.remove();
        }
    
        modal = document.createElement('div');
        modal.id = 'submission-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <p>Your answers have been submitted successfully!</p>
                <button id="go-to-results" class="modal-button">Go to Results</button>
            </div>
        `;
    
        document.body.appendChild(modal);
    
        document.getElementById('go-to-results').addEventListener('click', function () {
            window.location.href = '/aptitude_results'; // Redirect to results page
        });
    }
    
    
    function isOptionSelected() {
        return document.querySelector('input[name="option"]:checked') !== null;
    }
});    