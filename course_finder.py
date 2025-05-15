import pymongo
import re
from collections import Counter

def find_relevant_courses(mongo_uri, nptel_db_name, nptel_collection_name, 
                         career_db_name, career_collection_name, save_to_db=False):
    # Connect to MongoDB
    client = pymongo.MongoClient(mongo_uri)
    
    # Get the databases and collections
    nptel_db = client[nptel_db_name]
    nptel_collection = nptel_db[nptel_collection_name]
    
    career_db = client[career_db_name]
    career_collection = career_db[career_collection_name]
    
    # If save_to_db is True, we'll save matches to a new collection in the aicareer DB
    if save_to_db:
        # Clear existing matches in the aicareer database
        career_db.nptel_matches.drop()
    
    # Fetch all documents from the career collection
    career_docs = list(career_collection.find())
    
    if not career_docs:
        print(f"No documents found in the '{career_collection_name}' collection.")
        return
    
    # Process each career
    for career_doc in career_docs:
        career = career_doc.get("career", "").lower()
        roadmap = career_doc.get("roadmap", [])
        nptel_keywords = career_doc.get("nptel_keywords", [])
        
        # Combine search terms
        all_search_terms = set([career] + [term.lower() for term in roadmap] + 
                             [term.lower() for term in nptel_keywords])
        
        # Build query
        query_conditions = [
            {"Course-name": {"$regex": term, "$options": "i"}} for term in all_search_terms
        ] + [
            {"Discipline": {"$regex": term, "$options": "i"}} for term in all_search_terms
        ] + [
            {"content": {"$regex": term, "$options": "i"}} for term in all_search_terms
        ]

        results = nptel_collection.find({"$or": query_conditions})
        
        # Process and score courses
        relevant_courses = []
        for course in results:
            match_count = 0
            course_score = 0
            
            for term in all_search_terms:
                if re.search(term, course.get("Course-name", ""), re.IGNORECASE):
                    match_count += 1
                    course_score += 2
                if re.search(term, course.get("Discipline", ""), re.IGNORECASE):
                    match_count += 1
                    course_score += 1
                if re.search(term, course.get("content", ""), re.IGNORECASE):
                    match_count += 1
                    course_score += 1
            
            if match_count >= 2 or course_score > 3:
                course_data = {
                    'career': career_doc['career'],
                    'name': course.get('Course-name'),
                    'discipline': course.get('Discipline'),
                    'instructor': course.get('Course-instructor'),
                    'institute': course.get('Institute-name'),
                    'duration': course.get('Duration'),
                    'start_date': course.get('Start-date'),
                    'end_date': course.get('End-date'),
                    'course_link': course.get('Course-link'),
                    'nptel_url': course.get('NPTEL-URL'),
                    'content': course.get('content', '') if course.get('content') else '',
                    'score': course_score
                }
                relevant_courses.append(course_data)
        
        # Sort courses by score
        relevant_courses.sort(key=lambda x: x['score'], reverse=True)
        top_courses = relevant_courses[:3]
        
        # Save to the 'aicareer' database if requested
        if save_to_db and top_courses:
            career_db.nptel_matches.insert_many(top_courses)
            print(f"Saved {len(top_courses)} courses for {career_doc['career']}")

if __name__ == "__main__":
    # MongoDB connection URI
    mongo_uri = "mongodb://localhost:27017/"
    
    # Database and collection names
    nptel_db_name = "NPTEL_Course_details"
    nptel_collection_name = "2024_WA"
    
    career_db_name = "aicareer"
    career_collection_name = "career_suggestions"
    
    # Call the function to find and save relevant courses
    find_relevant_courses(mongo_uri, nptel_db_name, nptel_collection_name, 
                         career_db_name, career_collection_name, save_to_db=True)
