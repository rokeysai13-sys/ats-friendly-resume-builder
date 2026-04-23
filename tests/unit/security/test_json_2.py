import sys, os, json
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))
from app import create_app
from app.services.nlp_parser_service import parse_cv_text
from flask import jsonify

app = create_app()
with app.app_context():
    text = """RAHUL KUMAR
Phone: +91-9876543210
Email: [rahul.kumar@example.com](mailto:rahul.kumar@example.com)
Location: Visakhapatnam, Andhra Pradesh, India
...
"""
    res = parse_cv_text(text)
    try:
        response = jsonify({'data': res})
        print(response.get_data(as_text=True))
    except Exception as e:
        import traceback
        traceback.print_exc()
