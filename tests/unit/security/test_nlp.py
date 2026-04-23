import sys
import os
import traceback

# Add to sys.path to allow importing app
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app
from app.services.nlp_parser_service import parse_cv_text

app = create_app()
with app.app_context():
    text = """RAHUL KUMAR
Phone: +91-9876543210
Email: rahul.kumar@example.com
Location: Visakhapatnam, Andhra Pradesh, India
LinkedIn: linkedin.com/in/rahulkumar
GitHub: github.com/rahulkumar

---

CAREER OBJECTIVE
Motivated and detail-oriented Computer Science student...
"""
    try:
        res = parse_cv_text(text)
        print(res)
    except Exception as e:
        traceback.print_exc()
