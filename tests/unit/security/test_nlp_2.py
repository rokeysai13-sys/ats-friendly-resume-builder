import sys, os, traceback
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from app import create_app
from app.services.nlp_parser_service import parse_cv_text

app = create_app()
with app.app_context():
    text = """RAHUL KUMAR
Phone: +91-9876543210
Email: [rahul.kumar@example.com](mailto:rahul.kumar@example.com)
Location: Visakhapatnam, Andhra Pradesh, India
LinkedIn: linkedin.com/in/rahulkumar
GitHub: github.com/rahulkumar

---

CAREER OBJECTIVE
Motivated and detail-oriented Computer Science student seeking an entry-level software development position to apply programming skills, problem-solving abilities, and technical knowledge while contributing to organizational success.

---

EDUCATION

Bachelor of Technology (Computer Science Engineering)
Gayatri Vidya Parishad College of Engineering
Year of Passing: 2026
CGPA: 8.1

Intermediate (MPC)
Sri Chaitanya Junior College
Year of Passing: 2022
Percentage: 92%

SSC (10th)
Zilla Parishad High School
Year of Passing: 2020
Percentage: 90%

---

SKILLS

Technical Skills:

* Programming Languages: Python, Java, C, JavaScript
* Web Technologies: HTML, CSS, JavaScript, React
* Database: MySQL, MongoDB
* Tools: Git, VS Code, MS Excel
* Operating Systems: Windows, Linux

Soft Skills:

* Communication
* Teamwork
* Problem-solving
* Time management
* Adaptability

---

PROJECTS

Project Title: Student Management System
Technologies Used: Python, MySQL
Description:

* Developed a desktop application to manage student records and attendance.
* Implemented CRUD operations and secure login authentication.

Project Title: Online Food Ordering Website
Technologies Used: HTML, CSS, JavaScript
Description:

* Designed a responsive website for ordering food online.
* Integrated cart functionality and order tracking features.

---

INTERNSHIP

Company Name: Tech Solutions Pvt Ltd
Role: Software Developer Intern
Duration: May 2025 – July 2025

Responsibilities:

* Assisted in developing web-based applications.
* Fixed bugs and improved application performance.
* Collaborated with team members using Git version control.

---

CERTIFICATIONS

* Python Programming Certification – Coursera – 2024
* Web Development Bootcamp – Udemy – 2025
* SQL Fundamentals – Infosys Springboard – 2025

---

ACHIEVEMENTS

* Secured 1st place in college coding competition.
* Participated in state-level hackathon.
* Completed 100+ problems on coding platforms.

---

LANGUAGES

* English
* Telugu
* Hindi

---

HOBBIES

* Coding
* Reading technology blogs
* Playing cricket
* Listening to music

---

PERSONAL DETAILS

Date of Birth: 10/06/2004
Gender: Male
Nationality: Indian
Marital Status: Single

---

DECLARATION

I hereby declare that the information provided above is true and correct to the best of my knowledge and belief.

Date: 12/04/2026
Place: Visakhapatnam

Signature
RAHUL KUMAR
"""
    try:
        res = parse_cv_text(text)
        print(res)
    except Exception as e:
        traceback.print_exc()
