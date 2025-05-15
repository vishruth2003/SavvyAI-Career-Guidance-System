document.addEventListener("DOMContentLoaded", () => {
    const steps = document.querySelectorAll(".form-step");
    const nextBtns = document.querySelectorAll("#next-btn");
    const prevBtns = document.querySelectorAll("#prev-btn");
    const submitBtn = document.getElementById("submit-btn");
    let currentStep = 0;

    const ageInput = document.getElementById("age");

    const educationInput = document.getElementById("education");
    const syllabusDiv = document.getElementById("highschool-syllabus");
    const bachelorSpecializationDiv = document.getElementById("bachelors-specialization");
    const bachelorCourseDiv = document.getElementById("bachelors-course");
    const masterSpecializationDiv = document.getElementById("masters-specialization");
    const masterCourseDiv = document.getElementById("masters-course");
    const phdSpecializationDiv = document.getElementById("phd-specialization");

    // Dynamic course data for bachelor and master levels
    const bachelorCourses = {
        "be": ["CSE", "ECE", "Mechanical", "Civil"],
        "bsc": ["Physics", "Chemistry", "Biology", "Mathematics"],
        "bcom": ["Accounting", "Finance", "Marketing"],
        "bca": ["Software Development", "Data Science", "AI"]
    };

    const masterCourses = {
        "me": ["Thermodynamics", "Automobile", "Aerospace"],
        "mtech": ["Machine Learning", "Cyber Security", "Data Analytics"],
        "mcom": ["Taxation", "Financial Markets", "Audit"],
        "mca": ["Cloud Computing", "Web Development", "Mobile Applications"]
    };

    const bachelorSpecializationSelect = document.getElementById("bachelorSpecialization");
    const bachelorCourseSelect = document.getElementById("bachelorCourse");
    const masterSpecializationSelect = document.getElementById("masterSpecialization");
    const masterCourseSelect = document.getElementById("masterCourse");

    function updateCourseOptions(specializationSelect, courseSelect, courses) {
        const specialization = specializationSelect.value;
        const courseOptions = courses[specialization] || [];

        // Reset course select options
        courseSelect.innerHTML = '<option value="" selected disabled>Select course</option>';

        courseOptions.forEach(course => {
            const option = document.createElement("option");
            option.value = course.toLowerCase();
            option.textContent = course;
            courseSelect.appendChild(option);
        });

        // Add "Other" option at the end
        const otherOption = document.createElement("option");
        otherOption.value = "other";
        otherOption.textContent = "Other";
        courseSelect.appendChild(otherOption);
    }

    // Handle changes in the specialization selection for Bachelor's and Master's
    bachelorSpecializationSelect.addEventListener("change", () => {
        updateCourseOptions(bachelorSpecializationSelect, bachelorCourseSelect, bachelorCourses);
        if (bachelorSpecializationSelect.value === "other") {
            document.getElementById("bachelor-specialization-other").style.display = "block";
        }
    });

    masterSpecializationSelect.addEventListener("change", () => {
        updateCourseOptions(masterSpecializationSelect, masterCourseSelect, masterCourses);
        if (masterSpecializationSelect.value === "other") {
            document.getElementById("master-specialization-other").style.display = "block";
        }
    });

    // Update display of age/personality values as they are adjusted
    ageInput.addEventListener("input", () => {
        document.getElementById("age-value").textContent = ageInput.value;
    });

    // Show the current step in the form
    function showStep(step) {
        steps.forEach((s, index) => {
            s.classList.toggle("active", index === step);
        });
        prevBtns.forEach(btn => btn.style.display = step === 0 ? "none" : "inline");

        // Modify next button text based on user status and current step
        const status = document.querySelector('input[name="status"]:checked')?.value;
        if (status === "student" && step === 1) {
            // For students, change next button to "Finish" on education step
            nextBtns.forEach(btn => btn.textContent = "Finish");
        } else {
            nextBtns.forEach(btn => btn.textContent = step === steps.length - 1 ? "Finish" : "Next");
        }
    }

    // Event listeners for the next buttons
    nextBtns.forEach((btn, index) => {
        btn.addEventListener("click", () => {
            const status = document.querySelector('input[name="status"]:checked');

            if (currentStep === 0) {
                currentStep = 1;
            } else if (currentStep === 1) {
                if (status && status.value === "student") {
                    // For students, submit the form directly from the education step
                    submitBtn.click();
                    return;
                } else if (status && status.value === "professional") {
                    currentStep = 2; // Move to Step 3 (Work Experience)
                }
            }
            showStep(currentStep);
        });
    });

    // Event listeners for the previous buttons
    prevBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const status = document.querySelector('input[name="status"]:checked');

            if (currentStep === 0) return; // Already on Step 1
            else if (currentStep === 1) currentStep = 0; // Go back to Step 1
            else if (currentStep === 2) {
                currentStep = (status && status.value === "professional") ? 1 : 0;
            }
            showStep(currentStep);
        });
    });

    // Show/hide fields based on education selection
    educationInput.addEventListener("change", () => {
        const educationLevel = educationInput.value;

        syllabusDiv.style.display = "none";
        bachelorSpecializationDiv.style.display = "none";
        bachelorCourseDiv.style.display = "none";
        masterSpecializationDiv.style.display = "none";
        masterCourseDiv.style.display = "none";
        phdSpecializationDiv.style.display = "none";

        if (educationLevel === "highschool") {
            syllabusDiv.style.display = "block";
        } else if (educationLevel === "bachelor") {
            bachelorSpecializationDiv.style.display = "block";
            bachelorCourseDiv.style.display = "block";
        } else if (educationLevel === "master") {
            masterSpecializationDiv.style.display = "block";
            masterCourseDiv.style.display = "block";
        } else if (educationLevel === "phd") {
            phdSpecializationDiv.style.display = "block";
        }
    });

    // Function to handle showing 'Other' input for dropdowns
    function handleOtherOption(dropdown, otherInput) {
        dropdown.addEventListener("change", () => {
            otherInput.style.display = dropdown.value === "other" ? "block" : "none";
        });
    }

    // Apply handleOtherOption to relevant fields
    handleOtherOption(document.getElementById("syllabus"), document.getElementById("syllabus-other"));
    handleOtherOption(bachelorCourseSelect, document.getElementById("bachelor-course-other"));
    handleOtherOption(masterCourseSelect, document.getElementById("master-course-other"));
    handleOtherOption(bachelorSpecializationSelect, document.getElementById("bachelor-specialization-other"));
    handleOtherOption(masterSpecializationSelect, document.getElementById("master-specialization-other"));
    handleOtherOption(document.getElementById("phdSpecialization"), document.getElementById("phd-specialization-other"));

    // Form submission including additional fields
    submitBtn.addEventListener("click", (e) => {
        e.preventDefault();
    
        const status = document.querySelector('input[name="status"]:checked')?.value;
    
        const formData = {
            current_status: status,
            age: +document.getElementById("age").value,
            highest_level_of_education: educationInput.value,
            hobbies: document.getElementById("hobbies").value, // Assuming hobbies is an input field
            key_skills: document.getElementById("skills").value.split(',').map(skill => skill.trim()), // Convert to an array
            work_experience: status === "professional" ? document.getElementById("workExperience").value : "N/A", // Default work experience for student
    
            // Add education details dynamically based on the selected education level
            education_details: {}
        };
    
        if (educationInput.value === "highschool") {
            formData.education_details.syllabus = document.getElementById("syllabus").value === "other" 
                ? document.getElementById("syllabus-other").value 
                : document.getElementById("syllabus").value;
        } else if (educationInput.value === "bachelor") {
            formData.education_details.specialization = document.getElementById("bachelorSpecialization").value === "other" 
                ? document.getElementById("bachelor-specialization-other").value 
                : document.getElementById("bachelorSpecialization").value;
            formData.education_details.course = bachelorCourseSelect.value === "other" 
                ? document.getElementById("bachelor-course-other").value 
                : bachelorCourseSelect.value;
        } else if (educationInput.value === "master") {
            formData.education_details.specialization = document.getElementById("masterSpecialization").value === "other" 
                ? document.getElementById("master-specialization-other").value 
                : document.getElementById("masterSpecialization").value;
            formData.education_details.course = masterCourseSelect.value === "other" 
                ? document.getElementById("master-course-other").value 
                : masterCourseSelect.value;
        } else if (educationInput.value === "phd") {
            formData.education_details.specialization = document.getElementById("phdSpecialization").value === "other" 
                ? document.getElementById("phd-specialization-other").value 
                : document.getElementById("phdSpecialization").value;
        }
    
        // Send the form data to the server
        fetch("/api/save_user_data", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                window.location.href = "/aptitude";
            }
        })
        .catch(error => console.error('Error:', error));
    });   

    // Initialize the form to show the first step
    showStep(currentStep);
});