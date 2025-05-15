from flask import Flask, redirect, render_template, request, jsonify, session, url_for
from course_finder import find_relevant_courses
from qr_generator import generate_qr_code
from flask_pymongo import PyMongo
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
from werkzeug.utils import secure_filename
from bson.json_util import dumps
from mistralai import Mistral
from flask_bcrypt import Bcrypt
from datetime import datetime
from dotenv import load_dotenv
from bson import ObjectId, json_util
import random
import json
import logging
import os
import requests

load_dotenv()
app = Flask(__name__)
app.secret_key = "SavvyAI" 
MONGO_URI = "mongodb://localhost:27017/aicareer"
app.config["MONGO_URI"] = MONGO_URI  
mongo = PyMongo(app)
bcrypt = Bcrypt(app)  
CORS(app)

client = MongoClient(MONGO_URI)
db = client.aicareer
gaq_db = client.GAQ
community_db = client.Community_Savvyai
community_posts_collection = community_db.Posts
# GAQ collections for Easy, Medium, and Hard questions
GAQ_Collection = {
    "easy": "easy",  # Easy questions collection
    "medium": "medium",  # Medium questions collection
    "hard": "hard"  # Hard questions collection
}

# Initialize logging
logging.basicConfig(level=logging.DEBUG)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("pymongo").setLevel(logging.WARNING)

# Initialize Mistral client
api_key = os.getenv("API_KEY")
model = "mistral-large-latest"
mistral_client = Mistral(api_key=api_key)

@app.route('/login')
def index():
    return render_template('login.html', user=session.get('user'))

@app.route('/')
def home():
    return render_template('home.html', user=session.get('user'))

@app.route('/chatbot')
def chatbot():
    return render_template('chatbot.html', user=session.get('user'))

@app.route('/profile')
def profile():
    return render_template('profile.html', user=session.get('user'))

@app.route('/api/save_user_data', methods=['POST'])
def save_user_data():
    user_data = request.json  # Get data from the request

    # Validate the incoming data
    required_fields = ["current_status", "age", "highest_level_of_education",
                       "hobbies", "key_skills"]
    missing_fields = [field for field in required_fields if field not in user_data]
    if missing_fields:
        return jsonify({'status': 'error', 'message': f'Missing fields: {", ".join(missing_fields)}'}), 400

    # Insert data into MongoDB collection 'user_data'
    mongo.db.user_data.insert_one(user_data)

    return jsonify({'status': 'success', 'message': 'User data successfully saved.'}), 200

@app.route('/choices')
def choices():
    return render_template('choices.html', user=session.get('user'))

@app.route('/aptitude', methods=['GET', 'POST'])
def aptitude():
    # Fetch user data
    user = mongo.db.user_data.find_one()
    if not user:
        return redirect(url_for('index'))

    # Convert ObjectId in user data to string
    user['_id'] = str(user['_id'])  # Make sure the user ID is serializable

    user_age = int(user.get('age', 0))  # Safely convert to integer

    # Determine difficulty level based on age
    if user_age <= 18:
        collection_name = "Easy"
    elif 18 < user_age <= 25:
        collection_name = "Medium"
    else:
        collection_name = "Hard"

    # Fetch questions from the GAQ database
    questions_collection = gaq_db[collection_name]
    all_questions = list(questions_collection.find())

    # Convert ObjectId to string for each question
    for question in all_questions:
        question['_id'] = str(question['_id'])  # Convert ObjectId to string

    # Filtering questions by type
    logic_questions = [q for q in all_questions if q.get('Type') == 'Logic']
    math_questions = [q for q in all_questions if q.get('Type') == 'Mathematical']
    verbal_questions = [q for q in all_questions if q.get('Type') == 'Verbal']

    # Randomly select questions from each category
    selected_logic = random.sample(logic_questions, 5) if len(logic_questions) >= 5 else logic_questions
    selected_math = random.sample(math_questions, 5) if len(math_questions) >= 5 else math_questions
    selected_verbal = random.sample(verbal_questions, 5) if len(verbal_questions) >= 5 else verbal_questions

    # Combine selected questions
    selected_questions = selected_logic + selected_math + selected_verbal

    if 'current_index' not in session:
        session['current_index'] = 0

    current_index = session['current_index']

    if request.method == 'POST':
        answers = request.form.getlist('answers')

        session['current_index'] += 1
        if session['current_index'] >= len(selected_questions):
            session['current_index'] = len(selected_questions) - 1

        return redirect(url_for('aptitude'))

    # Pass user data to the template along with selected questions
    return render_template('aptitude.html', user=session.get('user'), questions=selected_questions, current_index=current_index)

@app.route('/api/save-aptitude-answers', methods=['POST'])
def save_aptitude_answers():
    # Fetch the user data from the database
    user = mongo.db.user_data.find_one()

    if not user:
        return jsonify({'status': 'error', 'message': 'User not found.'}), 404

    # Get answers and user details from the request
    answers = request.json.get('answers')  # List of answers provided by the user
    user_age = int(user.get('age', 0))  # Get user's age from the user data

    # Ensure that the answers are in a list format
    if not isinstance(answers, list):
        return jsonify({'status': 'error', 'message': 'Invalid data format. Expected a list of answers.'}), 400

    answered_results = []

    # Determine the difficulty based on user age
    if user_age <= 18:
        difficulty_level = 'easy'
        collection_name = "Easy"
    elif 18 < user_age <= 25:
        difficulty_level = 'medium'
        collection_name = "Medium"
    else:
        difficulty_level = 'hard'
        collection_name = "Hard"

    # Access the correct collection based on the difficulty level
    questions_collection = gaq_db[collection_name]

    # Process each answer
    for answer in answers:
        question_text = answer['question']
        selected_answer = answer['answered']

        # Fetch the question from the determined difficulty level collection
        question_data = questions_collection.find_one({"question": question_text})

        if question_data:
            correct_answer = question_data.get("correct_answer")
            correct_or_wrong = 'correct' if selected_answer == correct_answer else 'wrong'

            answered_results.append({
                "question": question_text,
                "answered": selected_answer,
                "correct_or_wrong": correct_or_wrong,
                "difficulty_level": difficulty_level
            })
        else:
            answered_results.append({
                "question": question_text,
                "answered": selected_answer,
                "correct_or_wrong": 'question not found',
                "difficulty_level": difficulty_level
            })

    # Insert answers into `gaq_answered` collection in the `aicareer` database
    mongo.db.gaq_answered.insert_many(answered_results)

    return jsonify({'status': 'success', 'message': 'Answers saved successfully.'})

@app.route('/aptitude_results', methods=['GET'])
def aptitude_results():
    # Fetch data from `gaq_answered` collection
    answered_data = list(mongo.db.gaq_answered.find())

    total_questions = len(answered_data)
    correct_answers = sum(1 for answer in answered_data if answer['correct_or_wrong'] == 'correct')
    wrong_answers = total_questions - correct_answers
    score_percentage = (correct_answers / total_questions) * 100 if total_questions > 0 else 0

    # Initialize counts for Logic, Mathematical, and Verbal questions
    logic_correct = 0
    math_correct = 0
    verbal_correct = 0

    detailed_results = []

    for answer in answered_data:
        difficulty_level = answer.get('difficulty_level')
        question_data = None

        # Determine the correct collection based on the difficulty level
        if difficulty_level == 'easy':
            collection_name = "Easy"
        elif difficulty_level == 'medium':
            collection_name = "Medium"
        elif difficulty_level == 'hard':
            collection_name = "Hard"
        else:
            collection_name = None  # Fallback in case the level is not recognized

        if collection_name:
            # Access the correct collection based on the difficulty level
            questions_collection = gaq_db[collection_name]

            # Fetch the question from the determined difficulty level collection
            question_data = questions_collection.find_one({"question": answer['question']})

        if question_data:
            detailed_results.append({
                'question': answer['question'],
                'selected_answer': answer['answered'],
                'correct_answer': question_data['correct_answer'],
                'options': question_data['options'],
                'is_correct': answer['correct_or_wrong'] == 'correct',
                'difficulty_level': difficulty_level
            })

            # Count correct answers for Logic, Mathematical, and Verbal questions
            if answer['correct_or_wrong'] == 'correct':
                if 'logic' in question_data.get('Type', '').lower():
                    logic_correct += 1
                elif 'mathematical' in question_data.get('Type', '').lower():
                    math_correct += 1
                elif 'verbal' in question_data.get('Type', '').lower():
                    verbal_correct += 1

    # Create aptitude results data
    aptitude_results_data = {
        "total_questions": total_questions,
        "correct_answers": correct_answers,
        "wrong_answers": wrong_answers,
        "score_percentage": score_percentage,
        "logic_correct": logic_correct,
        "math_correct": math_correct,
        "verbal_correct": verbal_correct  # Add counts for each category
    }

    # Insert the aptitude results data into `gaq_aptitude_results` collection in `aicareer` database
    mongo.db.gaq_aptitude_results.insert_one(aptitude_results_data)

    # Render the results on the results page
    return render_template(
        'aptitude_results.html',
        user=session.get('user'),
        total_questions=total_questions,
        correct_answers=correct_answers,
        wrong_answers=wrong_answers,
        score_percentage=score_percentage,
        detailed_results=detailed_results
    )

@app.route('/api/signup', methods=['POST'])
def signup():
    user_data = request.json
    existing_user = mongo.db.users.find_one({"email": user_data['email']})
    if existing_user:
        return jsonify({'success': False, 'message': 'Account already exists.'}), 400

    # Hash the password before storing
    hashed_password = bcrypt.generate_password_hash(user_data['password']).decode('utf-8')
    user_data['password'] = hashed_password  # Replace plain password with hashed password

    # Save the new user
    mongo.db.users.insert_one(user_data)
    return jsonify({'success': True}), 201

@app.route('/api/login', methods=['POST'])
def api_login():
    logging.debug("Login attempt.")
    user_data = request.json
    user = mongo.db.users.find_one({"email": user_data['email']})

    if user and bcrypt.check_password_hash(user['password'], user_data['password']):
        logging.debug(f"User {user['email']} logged in successfully.")
        session['user'] = {  # Store user information in the session
            'fullName': user['fullName'],
            'email': user['email']
        }
        return jsonify({'success': True, 'user': session['user']}), 200

    logging.debug(f"Failed login attempt for {user_data['email']}.")
    return jsonify({'success': False, 'message': 'Invalid email or password.'}), 401

@app.route('/api/logout', methods=['POST'])
def logout():
    session.pop('user', None)  # Remove user info from the session
    return jsonify({'success': True})

@app.route('/save-data/', methods=['POST'])
def save_data():
    user_data = request.json  # Get data from the request

    # Validate incoming data
    if not isinstance(user_data, dict):
        return jsonify({'status': 'error', 'message': 'Invalid data format. Expected a dictionary.'}), 400

    # Check for career preferences in the data
    if 'careerPreferences' not in user_data or not isinstance(user_data['careerPreferences'], dict):
        return jsonify({'status': 'error', 'message': 'Invalid or missing career preferences.'}), 400

    # Insert data into MongoDB
    mongo.db.user_responses.insert_one(user_data)

    # Generate questions after saving data
    result = generate_questions(user_data['careerPreferences'])

    return jsonify({'status': 'success', 'message': result}), 200

@app.route('/save-scenario-data', methods=['POST'])
def save_scenario_data():
    try:
        # Get data from the request
        user_data = request.json

        # Validate incoming data
        if not isinstance(user_data, dict):
            return jsonify({'status': 'error', 'message': 'Invalid data format. Expected a dictionary.'}), 400

        # Insert data into MongoDB
        mongo.db.scenario_responses.insert_one(user_data)

        return jsonify({'status': 'success', 'message': 'Scenario data saved successfully.'}), 200
    except Exception as e:
        logging.error(f"Error saving scenario data: {e}")
        return jsonify({'status': 'error', 'message': 'Failed to save scenario data.'}), 500

def generate_questions(career_preferences):
    """ Generate aptitude questions using Mistral API with career preferences and user data. """
    # Fetch the user data from the database
    user = mongo.db.user_data.find_one()
    if not user:
        return "User data not found.", 404

    # Prepare the content for generating technical questions
    content = (f"Generate 15 aptitude questions divided among these career preferences: {', '.join(career_preferences.values())}. "
               f"For each career preference:\n"
               f"- Generate questions testing core technical knowledge\n"
               f"- Include questions about fundamental principles and advanced concepts\n"
               f"- Questions should range from fundamental concepts to complex technical topics\n"
               f"- All options must be technically accurate and closely related\n"
               f"- No hypothetical scenarios, focus on technical knowledge\n"
               f"- Ensure equal distribution of questions across given career preferences\n"
               f"Consider the following user data while generating questions:\n"
               f"Age: {user.get('age')}\n"
               f"Current Status: {user.get('current_status')}\n"
               f"Highest Level of Education: {user.get('highest_level_of_education')}\n"
               f"Key Skills: {', '.join(user.get('key_skills', []))}\n"
               f"Education Details: Syllabus: {user.get('education_details', {}).get('syllabus', '')}, "
               f"Specialization: {user.get('education_details', {}).get('specialization', '')}, "
               f"Course: {user.get('education_details', {}).get('course', '')}\n"
               f"Please format the response as a JSON array like this: [{{"
               f"\"question\": \"Question text\","
               f"\"options\": [\"Option A\", \"Option B\", \"Option C\", \"Option D\"],"
               f"\"correct_answer\": \"Correct Option\","
               f"\"for_career_preference\": \"Career preference related to the question as it is in the given data; do not change anything\""
               f"}}].")

    # Save the prompt to a file
    prompt_file_path = os.path.join(os.getcwd(), 'prompts/fetch_questions_prompt.txt')
    with open(prompt_file_path, 'w', encoding='utf-8') as file:
        file.write(f"Career Preferences: {json.dumps(career_preferences, indent=2)}\n\n")
        file.write("Prompt Content:\n")
        file.write(content)
    logging.info(f"Questions generation prompt written to {prompt_file_path}")

    messages = [
        {
            "role": "user",
            "content": content
        }
    ]

    chat_response = mistral_client.chat.complete(
        model=model,
        messages=messages
    )

    # Assuming chat_response.choices[0].message.content gives the raw JSON response
    raw_response = chat_response.choices[0].message.content

    # Cleaned response extraction logic
    try:
        # Extract JSON array from raw response
        start_index = raw_response.index('[')  # Find the start of the JSON array
        end_index = raw_response.rindex(']') + 1  # Find the end of the JSON array
        cleaned_response = raw_response[start_index:end_index]  # Extract the JSON part

        # Parse the cleaned response to JSON
        questions_data = json.loads(cleaned_response)

        # Store in MongoDB (assuming collection is named 'questions')
        mongo.db.questions.insert_many(questions_data)

    except (json.JSONDecodeError, ValueError) as e:
        logging.error(f"Error processing API response: {e}")
        return "Failed to generate questions.", 500

    return "Aptitude questions successfully added to the database."

@app.route('/questions', methods=['GET'])
def get_questions():
    # Fetch questions from MongoDB
    questions_data = mongo.db.questions.find()

    # Convert MongoDB cursor to a list
    questions = list(questions_data)

    # Format questions as a list of dictionaries
    formatted_questions = [
        {
            "question": q['question'],
            "options": q['options'],
            "correct_answer": q.get("correct_answer")  # Include correct answer if needed
        }
        for q in questions
    ]

    # Initialize current question index in the session if not already set
    if 'current_index' not in session:
        session['current_index'] = 0

    # Get current index
    current_index = session['current_index']

    # Render the questions.html template with questions data and current index
    return render_template('questions.html', user=session.get('user'), questions=formatted_questions, current_index=current_index)

@app.route('/api/save-answers', methods=['POST'])
def save_answers():
    answers = request.json  # Get the answers from the request

    if not isinstance(answers, list):
        return jsonify({'status': 'error', 'message': 'Invalid data format. Expected a list.'}), 400

    results = []  # To store the results for insertion

    for answer in answers:
        question_data = mongo.db.questions.find_one({"question": answer['question']})

        if question_data:
            correct_answer = question_data.get("correct_answer")
            correct_or_wrong = 'correct' if answer['answered'] == correct_answer else 'wrong'

            results.append({
                "question": answer['question'],
                "answered": answer['answered'],
                "correct_or_wrong": correct_or_wrong,
            })
        else:
            results.append({
                "question": answer['question'],
                "answered": answer['answered'],
                "correct_or_wrong": 'question not found',
            })

    mongo.db.answered.insert_many(results)

    # Return status with redirect URL
    return jsonify({'status': 'success', 'message': 'Answers saved.', 'url': url_for('results')}), 200

@app.route('/results', methods=['GET'])
def results():
    # Fetch answered questions and their details from MongoDB
    answered_data = list(mongo.db.answered.find())

    # Get the original questions with correct answers and career preferences
    questions_data = {}
    all_career_preferences = set()  # Track all unique career preferences
    for answer in answered_data:
        question = mongo.db.questions.find_one({"question": answer['question']})
        if question:
            questions_data[answer['question']] = {
                'correct_answer': question['correct_answer'],
                'options': question['options'],
                'career_preference': question['for_career_preference']  # Added career preference field
            }
            all_career_preferences.add(question['for_career_preference'])  # Collect all career preferences

    # Calculate statistics
    total_questions = len(answered_data)
    correct_answers = sum(1 for answer in answered_data if answer['correct_or_wrong'] == 'correct')
    wrong_answers = total_questions - correct_answers
    score_percentage = (correct_answers / total_questions) * 100 if total_questions > 0 else 0

    # Track correct answers per career preference
    career_correct_count = {career: 0 for career in all_career_preferences}  # Initialize all with 0
    for answer in answered_data:
        question_info = questions_data.get(answer['question'])
        if question_info and answer['correct_or_wrong'] == 'correct':
            career_preference = question_info['career_preference']
            if career_preference:
                career_correct_count[career_preference] += 1

    # Create detailed results list
    detailed_results = []
    for answer in answered_data:
        question_info = questions_data.get(answer['question'])
        if question_info:
            detailed_results.append({
                'question': answer['question'],
                'selected_answer': answer['answered'],
                'correct_answer': question_info['correct_answer'],
                'options': question_info['options'],
                'is_correct': answer['correct_or_wrong'] == 'correct'
            })

    # Prepare the results data for MongoDB
    results_data = {
        "total_questions": total_questions,
        "correct_answers": correct_answers,
        "wrong_answers": wrong_answers,
        "score_percentage": score_percentage,
        "career_correct_count": career_correct_count  # Added career correct count
    }

    # Save results to the 'aptitude_result' collection
    mongo.db.aptitude_result.insert_one(results_data)

    return render_template(
        'results.html',
        user=session.get('user'),
        total_questions=total_questions,
        correct_answers=correct_answers,
        wrong_answers=wrong_answers,
        score_percentage=score_percentage,
        detailed_results=detailed_results
    )

@app.route('/fetch_suggestions', methods=['GET'])
def fetch_suggestions():
    # Fetch the required data from the 'user_data', 'user_responses', 'scenario_responses', 'gaq_aptitude_results', and 'aptitude_result' collections
    documents2 = list(mongo.db.user_data.find().limit(1))
    documents3_user = list(mongo.db.user_responses.find().limit(1))
    documents3_scenario = list(mongo.db.scenario_responses.find().limit(1))
    gaq_aptitude_result = list(mongo.db.gaq_aptitude_results.find().limit(1))
    aptitude_result = list(mongo.db.aptitude_result.find().limit(1))

    # Check for user_data
    if not documents2:
        logging.warning("No user info found in the 'user_data' collection.")
        return jsonify({'success': False, 'message': 'No user info available.'}), 404

    doc1 = documents2[0]  # Get the first document from user_data

    # Determine which responses to use based on the existence of the scenario_responses collection
    if documents3_scenario:
        doc2 = documents3_scenario[0]  # Get the first document from scenario_responses
    else:
        if not documents3_user:
            logging.warning("No user responses found in the 'user_responses' collection.")
            return jsonify({'success': False, 'message': 'No user responses available.'}), 404
        doc2 = documents3_user[0]  # Get the first document from user_responses

    # Check for gaq_aptitude_result
    if not gaq_aptitude_result:
        logging.warning("No aptitude results found in the 'gaq_aptitude_result' collection.")
        return jsonify({'success': False, 'message': 'No aptitude results available.'}), 404

    gaq_result = gaq_aptitude_result[0]  # Get the first document from gaq_aptitude_result

    # Check for aptitude_result
    if not aptitude_result:
        logging.warning("No aptitude results found in the 'aptitude_result' collection.")
        return jsonify({'success': False, 'message': 'No aptitude results available.'}), 404

    aptitude_result_doc = aptitude_result[0]  # Get the first document from aptitude_result

    # Prepare data for Mistral API (User Info)
    user_data = {
        "current status": doc1["current_status"],
        "age": doc1["age"],
        "Education pursuing": doc1["highest_level_of_education"],
        "Current field of study or work": doc1["hobbies"],
        "Key skills": doc1["key_skills"],
        "Work Experience": doc1["work_experience"]
    }

    # Prepare data for Mistral API (User Preferences)
    user_responses = {
        "First priority": doc2["careerPreferences"]["first"],
        "Second priority": doc2["careerPreferences"]["second"],
        "Third priority": doc2["careerPreferences"]["third"]
    }

    # Prepare the aptitude results for Mistral API
    aptitude_results = {
        "gaq_aptitude_result": {
            "logic_correct": gaq_result["logic_correct"],
            "math_correct": gaq_result["math_correct"],
            "verbal_correct": gaq_result["verbal_correct"],
            "score_percentage": gaq_result["score_percentage"]
        },
        "aptitude_result": {
            "career_correct_count": aptitude_result_doc["career_correct_count"],
            "score_percentage": aptitude_result_doc["score_percentage"]
        }
    }

    # Prepare the content for the API request
    content = (f"You are an AI model which is good at giving career suggestions for people, I want you to use your creativity and identify valid and future proof career paths based on the latest industry trends and perform these tasks\n\n"
               f"Based on the user details\n, {json.dumps(user_data)}\n\n"
               f"User preferences\n {json.dumps(user_responses)}\n\n"
               f"This the results of 15 general aptitude questions:\n, {json.dumps(aptitude_results['gaq_aptitude_result'])}\n\n"
               f"This is the result of 15 Technical Aptitude questions:\n, {json.dumps(aptitude_results['aptitude_result'])}\n\n"
               f"I want you to give career suggestions based on the aptitude results and user preferences. "
               f"Suggest 3 career paths along with 5 unique roadmap points that are valid in 2024's job market for each in JSON format. \n"
               f"Also provide 1 Udemy search query related to each career path (just the query, not the full URL). \n"
               f"Also provide 1 YouTube search query related to each career path (just the query, not the full URL). \n"
               f"Also provide 1 Coursera search query related to each career path (just the query, not the full URL). \n"
               f"Also provide 1 UpGrad search query related to each career path (just the query, not the full URL). \n"
               f"For each career path, please also give 5 high accurate keywords that can be used to search on the NPTEL website.\n"
               f"These should be keywords that are relevant to courses available on NPTEL (e.g., topics, course names, subjects). \n"
               f"Also give the percentage value which says how well that career suits them based on the data which you have, keep 60% as priority for technical aptitude results and keep 40% for general aptitude"
               f"Please provide 5 keywords, separated by commas. \n"
               f"Please format the response as a JSON array like this: \n"
               f"[{{\"career\": \"Career Name\",\"percentage\": \"Percentage value\" \"roadmap\": [\"Step 1\", \"Step 2\", \"Step 3\", \"Step 4\", \"Step 5\"], "
               f"\"udemy_query\": \"Search query for Udemy\", "
               f"\"youtube_query\": \"Search query for YouTube\", "
               f"\"coursera_query\": \"Search query for Coursera\", "
               f"\"upgrad_query\": \"Search query for UpGrad\", "
               f"\"nptel_keywords\": [\"keyword1\", \"keyword2\", \"keyword3\", \"keyword4\", \"keyword5\"]}}].")

    # Write content to a .txt file
    file_path = os.path.join(os.getcwd(), 'prompts/fetch_suggestions_prompt.txt')
    with open(file_path, 'w', encoding='utf-8') as file:
        file.write(content)
    logging.info(f"API request content written to {file_path}")
    try:
        chat_response = mistral_client.chat.complete(
            model=model,
            messages=[{
                "role": "user",
                "content": content
            }]
        )

        # Extract the response content
        raw_response = chat_response.choices[0].message.content
        #logging.debug(f"Raw API response: {raw_response}")

        # Extracting JSON data from the response
        lines = raw_response.splitlines()
        if lines[0] == "```" and lines[-1] == "```":
            json_data = "\n".join(lines[1:-1])
        elif lines[0] == "```json" and lines[-1] == "```":
            json_data = "\n".join(lines[1:-1])
        else:
            json_data = raw_response.strip()

        # Parse JSON data
        suggestions = json.loads(json_data)

        # Check if the suggestions are in the expected format
        if not isinstance(suggestions, list):
            logging.error("Invalid format for suggestions; expected a list.")
            return jsonify({'success': False, 'message': 'Invalid format in API response'}), 500

        # Construct full URLs and clean up the suggestions
        for suggestion in suggestions:
            suggestion['youtube_link'] = f"https://www.youtube.com/results?search_query={suggestion['youtube_query']}"
            suggestion['udemy_link'] = f"https://www.udemy.com/courses/search/?q={suggestion['udemy_query']}"
            suggestion['coursera_link'] = f"https://www.coursera.org/courses?query={suggestion['coursera_query']}"
            suggestion['upgrad_link'] = f"https://www.upgrad.com/search/?q={suggestion['upgrad_query']}"

            # Ensure NPTEL keywords are included from API response
            nptel_keywords = suggestion.get('nptel_keywords', [])
            suggestion['nptel_keywords'] = nptel_keywords

        # Update the 'career_suggestions' collection with the new data
        mongo.db.career_suggestions.insert_many(suggestions)

        logging.info(f"Inserted {len(suggestions)} suggestions into MongoDB.")

        # Return a redirect response
        return redirect(url_for('show_suggestions'))

    except json.JSONDecodeError as e:
        logging.error(f"Error decoding JSON response: {e}")
        return jsonify({'success': False, 'message': 'Invalid JSON in API response'}), 500
    except Exception as e:
        logging.error(f"Error while fetching suggestions: {e}")
        return jsonify({'success': False, 'message': 'Failed to fetch suggestions'}), 500

@app.route('/suggestions', methods=['GET'])
def show_suggestions():
    # Retrieve suggestions from MongoDB
    suggestions = mongo.db.career_suggestions.find()
    suggestions_list = list(suggestions)  # Convert cursor to list
    return render_template('suggestions.html', suggestions=suggestions_list, user=session.get('user'))

@app.route('/update-nptel-courses')
def update_nptel_courses():
    """
    Administrative route to update NPTEL course matches
    This should be called periodically or when new courses are added
    """
    try:
        # MongoDB connection settings
        mongo_uri = "mongodb://localhost:27017/"
        nptel_db_name = "NPTEL_Course_details"
        nptel_collection_name = "2024_WA"
        career_db_name = "aicareer"
        career_collection_name = "career_suggestions"

        # Call the function to find relevant courses
        find_relevant_courses(
            mongo_uri,
            nptel_db_name,
            nptel_collection_name,
            career_db_name,
            career_collection_name,
            save_to_db=True  # Add this parameter to your original function
        )

        return jsonify({"status": "success", "message": "NPTEL courses updated successfully"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/learning')
def learning():
    try:
        # Trigger the update of NPTEL courses before rendering the page
        update_nptel_courses()

        # Fetch all career suggestions from MongoDB
        career_data = list(mongo.db.career_suggestions.find())

        # Initialize dictionaries for our data
        careers_courses = {}
        youtube_resources = []
        nptel_courses = {}

        # Process each career
        for career in career_data:
            career_name = career['career']

            # Fetch the saved NPTEL courses for this career
            saved_nptel_courses = list(mongo.db.nptel_matches.find({"career": career_name}))

            # Convert ObjectId to string for each course
            for course in saved_nptel_courses:
                if '_id' in course:
                    course['_id'] = str(course['_id'])

            nptel_courses[career_name] = saved_nptel_courses

            # Process other learning resources
            careers_courses[career_name] = {
                'udemy': {
                    'title': f"Udemy Courses for {career_name}",
                    'description': f"Learn {career_name} skills with comprehensive Udemy courses",
                    'link': career.get('udemy_link')
                },
                'coursera': {
                    'title': f"Coursera Programs for {career_name}",
                    'description': f"Professional {career_name} certifications and courses",
                    'link': career.get('coursera_link')
                },
                'upgrad': {
                    'title': f"Upgrad Programs for {career_name}",
                    'description': f"Professional {career_name} degree and certification programs",
                    'link': career.get('upgrad_link')
                }
            }

            youtube_resources.append({
                'career': career_name,
                'title': f"YouTube Tutorials for {career_name}",
                'description': f"Free {career_name} tutorials and courses",
                'link': career.get('youtube_link')
            })

        return render_template('learning.html',
                           show_hamburger_menu=True,
                           careers_courses=careers_courses,
                           youtube_resources=youtube_resources,
                           nptel_courses=nptel_courses,
                           user=session.get('user'))

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/fetch_detailed_layout', methods=['GET'])
def fetch_detailed_layout():
    try:
        # Get all career suggestions
        career_suggestions = list(mongo.db.career_suggestions.find())
        logging.debug("Fetching detailed layout for the career suggestions")
        if not career_suggestions:
            logging.error("No career suggestions found")
            return jsonify({'success': False, 'message': 'No career suggestions found'}), 404

        layout_data_list = []

        # Process each career suggestion
        for career in career_suggestions:
            # Define the expected JSON format for each career
            json_format = {
                "heading": "string",
                "container": {
                    "leftColumn": [{
                        "id": "string",
                        "title": "string",
                        "matches": ["string", "string"],
                        "content": ["string", "string", "string"]
                    }],
                    "middleColumn": [{
                        "id": "string",
                        "title": "string",
                        "tooltip": "string"
                    }],
                    "rightColumn": [{
                        "id": "string",
                        "title": "string",
                        "matches": ["string", "string"],
                        "content": ["string", "string", "string"]
                    }]
                }
            }

            # Prepare the API request content for each career
            content = (f"For the career path: {career['career']}, \n\n"
                      f"Please generate a JSON structure for a web page layout or content presentation. The JSON should include the following components:\n"
                      f"Heading: A title or heading of the page or content section.\n"
                      f"Container: A main container divided into sections (e.g., columns, blocks, or regions):\n\n"
                      f"Left Column: An array of items or cards with the following structure:\n\n"
                      f"id: A unique identifier for each item/card.\n"
                      f"title: The title or name of the item/card.\n"
                      f"matches: A list of related item IDs or references.\n"
                      f"content: A list of text content or descriptions for each item (e.g., bullet points or key information). There should be minimum 3 points of 15 words\n"
                      f"Middle Column: An array of items (e.g., flowchart, timeline, steps) this should be headings to pursue that career with the following structure:\n"
                      f"id: A unique identifier for each item.\n"
                      f"title: A title or label for the item. Minimum of 6 titles\n"
                      f"tooltip: A description or additional info about the item.\n"
                      f"Right Column: An array of items or cards with the same structure as the left column:\n"
                      f"id: A unique identifier for each item/card.\n"
                      f"title: The title or name of the item/card.\n"
                      f"matches: A list of related item IDs or references. The matches array in left column and right column matches to the id in middle column\n"
                      f"content: A list of text content or descriptions for each item (e.g., bullet points or key information). There should be minimum 3 points of 15 words\n"
                      f"Format: The JSON output should be structured as follows:\n\n {json_format}\n\n"
                      f"In the structure:\n"
                      f"heading: The main title or header for the page.\n"
                      f"container: Contains three sections:\n"
                      f"leftColumn: A list of cards or blocks for content or information. the string values of id should be l1, l2, l3 like that\n"
                      f"middleColumn: A list of items such as a flowchart, steps, or milestones with descriptive tooltips. the string values of id should be m1, m2, m3 like that\n"
                      f"rightColumn: Another list of cards or blocks for related content or career options. the string values of id should be r1, r2, r3 like that\n"
                      f"there should be minimum 5 cards in both left and right column\n"
                      f"The structure should be flexible and generic enough to accommodate different types of web content layouts, such as educational paths, career advice, product info, etc.\n")

            # Save the prompt to a file
            prompt_file_path = os.path.join(os.getcwd(), f'prompts/fetch_layout_prompt_{career["career"]}.txt')
            with open(prompt_file_path, 'w', encoding='utf-8') as file:
                file.write(content)
            logging.info(f"Layout generation prompt written to {prompt_file_path}")

            try:
                chat_response = mistral_client.chat.complete(
                    model=model,
                    messages=[{
                        "role": "user",
                        "content": content
                    }]
                )

                # Extract and clean response
                raw_response = chat_response.choices[0].message.content
                logging.debug(f"Raw API response for layout: {raw_response}")

                # Clean and parse JSON response
                json_str = raw_response.strip()

                # Handle code block formatting
                if "```json" in json_str:
                    json_str = json_str.split("```json")[1].split("```")[0]
                elif "```" in json_str:
                    json_str = json_str.split("```")[1].split("```")[0]

                # Parse JSON
                layout_data = json.loads(json_str.strip())

                # Add career identifier to layout data
                layout_data['career_id'] = str(career['_id'])
                layout_data['career_name'] = career['career']

                layout_data_list.append(layout_data)

            except Exception as e:
                logging.error(f"Error processing career {career['career']}: {e}")
                continue
        
        # Save all layouts to MongoDB after processing all careers
        if layout_data_list:
            try:
                mongo.db.page_layout.insert_many(layout_data_list)
                logging.info(f"Successfully saved {len(layout_data_list)} detailed layout data to MongoDB")
                return jsonify({
                    'success': True,
                    'message': f'Successfully generated and saved {len(layout_data_list)} layouts'
                }), 200
            except Exception as e:
                logging.error(f"Error saving layouts to MongoDB: {e}")
                return jsonify({
                    'success': False,
                    'message': 'Error saving layouts to database'
                }), 500
        else:
            return jsonify({
                'success': False,
                'message': 'No layouts were generated successfully'
            }), 500

    except Exception as e:
        logging.error(f"Error in fetch_detailed_layout: {e}")
        return jsonify({
            'success': False,
            'message': f'Failed to fetch detailed layout: {str(e)}'
        }), 500

#functions related to detailed pathway
@app.route('/roadmap')
def roadmap():
    career_collection = db['career_suggestions']
    # Fetch all careers from career_suggestions collection
    careers = list(career_collection.find({}, {'career': 1, 'roadmap': 1, 'percentage': 1}))
    return render_template('roadmap.html', show_hamburger_menu=True, careers=careers, user=session.get('user'))

def json_serialize(data):
    """
    Convert MongoDB ObjectId and other non-serializable types into a serializable format
    """
    if isinstance(data, ObjectId):
        return str(data)
    elif isinstance(data, dict):
        return {key: json_serialize(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [json_serialize(item) for item in data]
    else:
        return data

@app.route('/api/layout/<career_id>')
def get_layout(career_id):
    layout_collection = db['page_layout']
    # Fetch the layout document for the specific career
    layout = layout_collection.find_one({'career_id': career_id})
    if layout:
        return jsonify(json_serialize(layout))
    return jsonify({'error': 'Layout not found'}), 404

@app.route('/api/careers')
def get_careers():
    career_collection = db['career_suggestions']
    # Fetch all careers with their roadmaps
    careers = list(career_collection.find({}, {'career': 1, 'roadmap': 1}))
    return jsonify(json_serialize(careers))

#feedback
@app.route('/feedback')
def feedback_page():
    """Render the feedback page"""
    if 'user' not in session:
        return redirect(url_for('login'))
    return render_template('feedback.html', show_hamburger_menu=True, user=session.get('user'))

@app.route('/api/submit-feedback', methods=['POST'])
def submit_feedback():
    """Handle feedback form submission"""
    try:
        # Get feedback data from request
        feedback_data = request.json

        # Add user info and timestamp
        feedback_data.update({
            'submitted_at': datetime.utcnow(),
            'user_email': session['user'].get('email')
        })

        # Insert into MongoDB
        result = mongo.db.feedback.insert_one(feedback_data)

        if result.inserted_id:
            return jsonify({
                'success': True,
                'message': 'Feedback submitted successfully'
            }), 201

        else:
            raise Exception("Failed to insert feedback")

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'An error occurred while submitting feedback'
        }), 500

@app.route('/community')
def community():
    if 'user' not in session:
        return redirect(url_for('login'))

    # Fetch all posts from MongoDB
    posts = list(community_posts_collection.find().sort('created_at', -1))

    # Convert ObjectId to string for JSON serialization
    for post in posts:
        post['_id'] = str(post['_id'])

    return render_template('community.html', show_hamburger_menu=True, user=session.get('user'), posts=posts)

@app.route('/api/posts', methods=['GET', 'POST'])
def handle_posts():
    if 'user' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    if request.method == 'POST':
        data = request.json
        post = {
            'community': data.get('community'),
            'title': data.get('title'),
            'content': data.get('content'),
            'author': session['user'].get('fullName', 'Anonymous'),
            'author_email': session['user'].get('email'),
            'created_at': datetime.utcnow(),
            'likes': 0,
            'comments': 0,
            'shares': 0,
            'saved': False,
            'tags': data.get('tags', []),
            'authorAvatar': f"https://api.dicebear.com/6.x/avataaars/svg?seed={session['user'].get('email')}"
        }

        result = community_posts_collection.insert_one(post)
        post['_id'] = str(result.inserted_id)
        return jsonify(post), 201

    # GET method
    community = request.args.get('community', 'all')
    search = request.args.get('search', '')
    sort = request.args.get('sort', 'recent')

    query = {}
    if community != 'all':
        query['community'] = community
    if search:
        query['$or'] = [
            {'title': {'$regex': search, '$options': 'i'}},
            {'content': {'$regex': search, '$options': 'i'}},
            {'tags': {'$regex': search, '$options': 'i'}}
        ]

    sort_query = [('created_at', -1)] if sort == 'recent' else [('likes', -1)]

    posts = list(community_posts_collection.find(query).sort(sort_query))
    for post in posts:
        post['_id'] = str(post['_id'])

    return jsonify(posts)

@app.route('/api/posts/<post_id>/like', methods=['POST'])
def like_post(post_id):
    if 'user' not in session:
        return jsonify({'error': 'Unauthorized'}), 401

    user_email = session['user'].get('email')
    post = community_posts_collection.find_one({'_id': ObjectId(post_id)})

    if not post:
        return jsonify({'error': 'Post not found'}), 404

    likes_by = post.get('likes_by', [])
    if user_email in likes_by:
        likes_by.remove(user_email)
    else:
        likes_by.append(user_email)

    community_posts_collection.update_one(
        {'_id': ObjectId(post_id)},
        {'$set': {'likes_by': likes_by, 'likes': len(likes_by)}}
    )

    return jsonify({'liked': user_email in likes_by})

@app.route('/profile_overview')
def profile_overview():
    return render_template('profile_overview.html', show_hamburger_menu=True, user=session.get('user'))

def parse_json(data):
    """Convert MongoDB BSON to JSON."""
    return json.loads(json_util.dumps(data))

@app.route('/api/update-profile', methods=['POST'])
def update_profile():
    try:
        data = request.json
        user_email = data.get("email")

        if not user_email:
            return jsonify({'error': 'Email is required'}), 400

        logging.info(f"Starting profile update for email: {user_email}")

        # Update users collection - takes first document
        new_user_doc = {
            "email": user_email,
            "fullName": data["name"]
        }
        users_result = db.users.replace_one(
            {},  # Empty filter to get first document
            new_user_doc,
            upsert=True
        )

        # Update user_data collection - takes first document
        new_user_data_doc = {
            "current_status": data.get("currentStatus"),
            "age": int(data.get("age")) if data.get("age") else None,
            "highest_level_of_education": data.get("education"),
            "hobbies": data.get("hobbies"),
            "key_skills": data.get("keySkills", []),
            "education_details": {
                "syllabus": data.get("educationDetails", {}).get("syllabus", ""),
                "specialization": data.get("educationDetails", {}).get("specialization", ""),
                "course": data.get("educationDetails", {}).get("course", "")
            },
            "work_experience": data.get("workExperience", [])
        }

        user_data_result = db.user_data.replace_one(
            {},  # Empty filter to get first document
            new_user_data_doc,
            upsert=True
        )
        social_links_doc = {
            "email": user_email,  # Add user identifier
            "github_link": data.get("githubLink"),
            "linkedin_link": data.get("linkedinLink")
        }

        social_links_result = db.social_links.replace_one(
            {"email": user_email},  # Filter by user email
            social_links_doc,
            upsert=True
        )
        return jsonify({
            'message': 'Profile updated successfully!',
            'updates': {
                'users': bool(users_result.acknowledged),
                'user_data': bool(user_data_result.acknowledged),
                'social_links': bool(social_links_result.acknowledged)
            }
        }), 200

    except Exception as e:
        logging.error(f"Error in update_profile: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'details': str(e)
        }), 500

@app.route('/api/profile-data')
def get_profile_data():
    try:
        # Get first document from each collection
        user = db.users.find_one()
        if not user:
            return jsonify({'error': 'User not found'}), 404

        user_data = db.user_data.find_one()
        if not user_data:
            return jsonify({'error': 'User data not found'}), 404

        # Get career suggestions (first 3)
        career_suggestions = list(db.career_suggestions.find().limit(3))

        # Get user responses
        user_responses = db.user_responses.find_one()

        # Get aptitude scores (first document from each)
        technical_aptitude = db.aptitude_result.find_one()
        general_aptitude = db.gaq_aptitude_results.find_one()

        # Prepare response data matching frontend structure
        profile_data = {
            'user': {
                'name': user.get('fullName', ''),
                'email': user.get('email', '')
            },
            'userData': {
                'currentStatus': user_data.get('current_status', ''),
                'age': user_data.get('age', ''),
                'education': user_data.get('highest_level_of_education', ''),
                'hobbies': user_data.get('hobbies', ''),
                'keySkills': user_data.get('key_skills', []),
                'personalityTraits': user_data.get('personality_traits', {}),
                'educationDetails': {
                    'syllabus': user_data.get('education_details', {}).get('syllabus', ''),
                    'specialization': user_data.get('education_details', {}).get('specialization', ''),
                    'course': user_data.get('education_details', {}).get('course', '')
                },
                'workExperience': user_data.get('work_experience', [])
            },
            'careerSuggestions': [
                {
                    'title': career.get('career', ''),
                    'match': career.get('percentage', ''),  # Default match percentage
                    'roadmap': career.get('roadmap', []),
                    'resources': {
                        'udemy': career.get('udemy_link', ''),
                        'youtube': career.get('youtube_link', ''),
                        'coursera': career.get('coursera_link', ''),
                        'upgrad': career.get('upgrad_link', ''),
                        'nptel_keywords': career.get('nptel_keywords', [])
                    }
                } for career in career_suggestions
            ],
            'aptitudeScores': [
                {
                    'name': 'Technical',
                    'score': technical_aptitude.get('score_percentage', 0) if technical_aptitude else 0,
                    'details': {
                        'total': technical_aptitude.get('total_questions', 0) if technical_aptitude else 0,
                        'correct': technical_aptitude.get('correct_answers', 0) if technical_aptitude else 0,
                        'wrong': technical_aptitude.get('wrong_answers', 0) if technical_aptitude else 0
                    }
                },
                {
                    'name': 'General',
                    'score': general_aptitude.get('score_percentage', 0) if general_aptitude else 0,
                    'details': {
                        'total': general_aptitude.get('total_questions', 0) if general_aptitude else 0,
                        'correct': general_aptitude.get('correct_answers', 0) if general_aptitude else 0,
                        'wrong': general_aptitude.get('wrong_answers', 0) if general_aptitude else 0
                    }
                }
            ],
            'careerPreferences': user_responses.get('careerPreferences', {}) if user_responses else {}
        }
        social_links = db.social_links.find_one()

        # Add social links to userData
        profile_data['userData']['githubLink'] = social_links.get('github_link', '') if social_links else ''
        profile_data['userData']['linkedinLink'] = social_links.get('linkedin_link', '') if social_links else ''
        output_file_path = "static/profile_cards/qrcode.png"
        generate_qr_code(profile_data['userData']['linkedinLink'], output_file_path)
        return jsonify(parse_json(profile_data))

    except Exception as e:
        logging.error(f"Error fetching profile data: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/decision')
def decision():
    return render_template('decision.html', user=session.get('user'))

@app.route('/scenario_chatbot')
def scenario_chatbot():
    return render_template('scenario_chatbot.html', user=session.get('user'))

@app.route('/policies')
def policies():
    return render_template('policy.html', user=session.get('user'))

@app.route('/linkdin')
def linkdin():
    career_suggestions_collection = db['career_suggestions']

    # Fetch the first document from the career_suggestions collection
    career_suggestion = career_suggestions_collection.find_one()

    if not career_suggestion:
        return jsonify({'error': 'No career suggestions found'}), 404

    # Extract the career value
    career_keyword = career_suggestion.get('career')
    print(career_keyword)
    # LinkedIn API details
    url = "https://linkedin-api8.p.rapidapi.com/search-jobs"
    querystring = {
        "keywords": career_keyword,
        "locationId": "102713980",
        "datePosted": "anyTime",
        "sort": "mostRelevant"
    }
    headers = {
        "x-rapidapi-key": "03ca4eda3fmshb17a27cbe55673cp1430d5jsn600afaa0f966",
        "x-rapidapi-host": "linkedin-api8.p.rapidapi.com"
    }

    # Make the API request
    response = requests.get(url, headers=headers, params=querystring)
    data = response.json()

    # Pass data to the template
    return render_template('linkdin.html', jobs=data, user=session.get('user'))


if __name__ == "__main__":
    prompts_folder = os.path.join(os.getcwd(), 'prompts')
    if not os.path.exists(prompts_folder):
        os.makedirs(prompts_folder)
    app.run(debug=True)